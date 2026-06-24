import json, os, asyncio, httpx
from datetime import datetime, timezone
from pathlib import Path
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from sqlalchemy import create_engine, Column, Integer, String, DateTime
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import declarative_base, sessionmaker

DB_URL = os.environ.get("DATABASE_URL", "sqlite:///./worldpulse.db")
NEWS_KEY = os.environ.get("NEWS_API_KEY", "")
DATA_DIR = Path(__file__).parent

def _load_json(name: str):
    with open(DATA_DIR / name, encoding="utf-8") as f:
        return json.load(f)

C = _load_json("countries.json")
S = _load_json("states.json")
C_LKUP = {c["name"]: c for c in C}
TOTAL_STATES = sum(len(states) for states in S.values())

connect_args = {"check_same_thread": False} if DB_URL.startswith("sqlite") else {}
engine = create_engine(DB_URL, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class Art(Base):
    __tablename__ = "arts"
    id = Column(Integer, primary_key=True)
    c = Column(String(100), index=True)
    s = Column(String(100), index=True, default="")
    t = Column(String(500))
    src = Column(String(200))
    u = Column(String(1000), unique=True)
    sum = Column(String(2000))
    ts = Column(DateTime)
    fts = Column(DateTime, default=lambda: datetime.now(timezone.utc))

Base.metadata.create_all(bind=engine)
app = FastAPI(title="GodiGlobe API", version="4.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"])

# Dictionary of asyncio.Event to allow waiting for ongoing fetches
_fetch_events = {}

def _truncate_summary(text: str, max_len: int = 500) -> str:
    text = text.strip()
    if len(text) <= max_len:
        return text
    return text[:max_len].rstrip() + "..."

async def fetch(c: str, s: str = ""):
    if not NEWS_KEY:
        print("NEWS_API_KEY is not set; skipping news fetch.")
        return

    location_key = f"{c}:{s}"
    if location_key in _fetch_events:
        # Wait for the ongoing fetch to complete
        await _fetch_events[location_key].wait()
        return

    event = asyncio.Event()
    _fetch_events[location_key] = event

    db = SessionLocal()
    try:
        iso = C_LKUP.get(c, {}).get("iso2", "").lower()
        async with httpx.AsyncClient() as cl:
            query = f'"{s}"' if s else f'"{c}"'
            params = {"language": "en", "size": 10, "apikey": NEWS_KEY}
            if s:
                params["qInTitle"] = query
            else:
                params["q"] = query
            if iso:
                params["country"] = iso
            
            resp = await cl.get("https://newsdata.io/api/1/latest", params=params, timeout=15)
            d = resp.json()
            if d.get("status") != "success": 
                return

            for a in d.get("results", []):
                t, l, src = a.get("title"), a.get("link"), a.get("source_name", "Unknown")
                if not t or not l: continue
                
                exists = db.query(Art).filter(Art.u == l).first()
                if not exists:
                    desc = a.get("description") or a.get("content") or a.get("title", "")
                    summary = _truncate_summary(desc)
                    pub = a.get("pubDate")
                    published = datetime.now(timezone.utc)
                    if pub:
                        try:
                            published = datetime.fromisoformat(pub.replace("Z", "+00:00"))
                        except ValueError:
                            pass
                    db.add(Art(c=c, s=s, t=t, src=src, u=l, sum=summary, ts=published))
            db.commit()
    except Exception as e: 
        print(f"Error fetching news: {e}")
        db.rollback()
    finally: 
        db.close()
        event.set()
        _fetch_events.pop(location_key, None)

@app.get("/news/{c}")
async def get_news(c: str, bt: BackgroundTasks, state: str = ""):
    if not C_LKUP.get(c): raise HTTPException(404, detail="Country not found")
    db = SessionLocal()
    try:
        a = db.query(Art).filter(Art.c == c, Art.s == state).order_by(Art.ts.desc()).limit(20).all()
        
        stale = False
        if a and a[0].ts:
            ts_aware = a[0].ts.replace(tzinfo=timezone.utc) if not a[0].ts.tzinfo else a[0].ts
            stale = ts_aware.timestamp() < datetime.now(timezone.utc).timestamp() - 7200
            
        if not a:
            await fetch(c, state)
            a = db.query(Art).filter(Art.c == c, Art.s == state).order_by(Art.ts.desc()).limit(20).all()
        elif stale:
            bt.add_task(fetch, c, state)
            
        return {
            "country": c, 
            "state": state, 
            "status": "cached" if a and not stale else "refreshing", 
            "articles": [{"id": x.id, "title": x.t, "source": x.src, "url": x.u, "summary": x.sum, "published_at": x.ts.isoformat() if x.ts else None} for x in a]
        }
    finally: 
        db.close()

@app.get("/countries")
def get_countries(): return C

@app.get("/major-countries")
def get_major_countries(): 
    return [c for c in C if c.get("population", 0) > 40_000_000 or c.get("iso2", "") in {"US", "CN", "JP", "DE", "FR", "GB", "IN", "BR", "CA", "AU", "IT", "KR", "RU", "MX", "ID", "SA", "TR", "ZA"}]

@app.get("/states/{c}")
def get_states(c: str): return {"country": c, "states": S.get(c, [])}

@app.get("/stats")
def get_stats():
    db = SessionLocal()
    try:
        return {
            "total_articles": db.query(Art).count(),
            "countries_tracked": db.query(Art.c).distinct().count(),
            "total_states": TOTAL_STATES,
        }
    finally:
        db.close()

@app.get("/health")
def health_check(): return {"status": "ok"}
