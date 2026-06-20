import json, os, asyncio, httpx
from datetime import datetime, timezone
from pathlib import Path
from difflib import SequenceMatcher as SM
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from sqlalchemy import create_engine, Column, Integer, String, DateTime
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import declarative_base, sessionmaker

DB_URL, NEWS_KEY, HF_KEY = os.environ.get("DATABASE_URL", "sqlite:///./worldpulse.db"), os.environ.get("NEWS_API_KEY", ""), os.environ.get("HF_API_KEY", "")
D = Path(__file__).parent
C, S = json.load(open(D/"countries.json", encoding="utf-8")), json.load(open(D/"states.json", encoding="utf-8"))
C_LKUP = {c["name"]: c for c in C}

engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal, Base = sessionmaker(bind=engine), declarative_base()

class Art(Base):
    __tablename__ = "arts"
    id, c, s = Column(Integer, primary_key=True), Column(String(100), index=True), Column(String(100), index=True, default="")
    t, src, u, sum = Column(String(500)), Column(String(200)), Column(String(1000), unique=True), Column(String(2000))
    ts, fts = Column(DateTime), Column(DateTime, default=lambda: datetime.now(timezone.utc))

Base.metadata.create_all(bind=engine)
app = FastAPI(title="GodiGlobe API", version="4.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"])
_f = set()

async def sum_hf(c: httpx.AsyncClient, tx: str) -> str:
    if not HF_KEY or len(tx.split())<20: return tx[:280]
    try:
        r = await c.post("https://api-inference.huggingface.co/models/sshleifer/distilbart-cnn-12-6", headers={"Authorization": f"Bearer {HF_KEY}"}, json={"inputs": tx[:1024]}, timeout=10)
        return r.json()[0].get("summary_text", tx[:280]) if r.status_code == 200 else tx[:280]
    except: return tx[:280]

async def fetch(c: str, s: str = ""):
    db = SessionLocal()
    try:
        iso = C_LKUP.get(c, {}).get("iso2", "").lower()
        async with httpx.AsyncClient() as cl:
            d = (await cl.get("https://newsdata.io/api/1/latest", params={"language": "en", "size": 10, "apikey": NEWS_KEY, ("qInTitle" if s else "q"): f'"{s}"' if s else f'"{c}"', **({"country": iso} if iso else {})}, timeout=15)).json()
            if d.get("status") != "success": return
            ex_arts = db.query(Art).filter(Art.c == c, Art.s == s).order_by(Art.ts.desc()).limit(20).all()
            new_arts = []
            for a in d.get("results", []):
                t, l, src = a.get("title"), a.get("link"), a.get("source_name", "Unknown")
                if not t or not l: continue
                if m := next((x for x in ex_arts if SM(None, x.t.lower(), t.lower()).ratio() > 0.6), None):
                    if src not in m.src: m.src += f", {src}"
                    m.fts = datetime.now(timezone.utc)
                elif m := next((x for x in new_arts if SM(None, x["title"].lower(), t.lower()).ratio() > 0.6), None):
                    if src not in m["src"]: m["src"] += f", {src}"
                else:
                    a["src"] = src
                    new_arts.append(a)
            if new_arts:
                sums = await asyncio.gather(*(sum_hf(cl, a.get("description") or a.get("content") or a.get("title", "")) for a in new_arts))
                for a, sm in zip(new_arts, sums): db.add(Art(c=c, s=s, t=a["title"], src=a["src"], u=a["link"], sum=sm, ts=datetime.now(timezone.utc)))
            db.commit()
    except Exception as e: db.rollback()
    finally: db.close(); _f.discard(f"{c}:{s}")

@app.get("/news/{c}")
def get_news(c: str, bt: BackgroundTasks, state: str = ""):
    if not C_LKUP.get(c): raise HTTPException(404)
    db = SessionLocal()
    try:
        a = db.query(Art).filter(Art.c == c, Art.s == state).order_by(Art.ts.desc()).limit(20).all()
        stale = bool(a and a[0].ts and (a[0].ts.replace(tzinfo=timezone.utc) if not a[0].ts.tzinfo else a[0].ts).timestamp() < datetime.now(timezone.utc).timestamp() - 7200)
        if not a or stale:
            if f"{c}:{state}" not in _f:
                _f.add(f"{c}:{state}")
                if not a: asyncio.run(fetch(c, state)); a = db.query(Art).filter(Art.c == c, Art.s == state).order_by(Art.ts.desc()).limit(20).all()
                else: bt.add_task(lambda: asyncio.run(fetch(c, state)))
        return {"country": c, "state": state, "status": "cached" if a and not stale else "refreshing", "articles": [{"id": x.id, "title": x.t, "source": x.src, "url": x.u, "summary": x.sum, "published_at": x.ts.isoformat() if x.ts else None} for x in a]}
    finally: db.close()

@app.get("/countries")
def get_countries(): return C
@app.get("/major-countries")
def get_major_countries(): return [c for c in C if c.get("population", 0) > 40_000_000 or c.get("iso2", "") in {"US", "CN", "JP", "DE", "FR", "GB", "IN", "BR", "CA", "AU", "IT", "KR", "RU", "MX", "ID", "SA", "TR", "ZA"}]
@app.get("/states/{c}")
def get_states(c: str): return {"country": c, "states": S.get(c, [])}
@app.get("/stats")
def get_stats():
    db = SessionLocal()
    try: return {"total_articles": db.query(Art).count(), "countries_tracked": db.query(Art.c).distinct().count()}
    finally: db.close()
@app.get("/health")
def health_check(): return {"status": "ok"}
