# GodiGlobe

GodiGlobe is a full-stack news exploration platform that maps global headlines onto an interactive 3D globe. Click a country—or drill into states and provinces—to browse cached, deduplicated articles sourced from NewsData.io.

## Features

- **Interactive 3D globe** — WebGL globe with country polygons, state boundaries, and labeled major nations.
- **Geographic news drill-down** — Country-level and state-level queries with ISO-based filtering for accuracy.
- **Smart caching** — Articles are stored in SQLite; stale data (older than 2 hours) refreshes in the background.
- **Deduplication** — Articles are keyed by URL so the same story from multiple outlets does not appear twice.
- **Responsive panel UI** — Slide-in news sidebar with refresh, state picker, and external article links.

## Architecture

```
┌─────────────────┐     REST (JSON)     ┌──────────────────┐
│  React + Vite   │ ◄──────────────────► │  FastAPI         │
│  react-globe.gl │                      │  SQLAlchemy      │
└─────────────────┘                      └────────┬─────────┘
                                                  │
                                         ┌────────▼─────────┐
                                         │  SQLite          │
                                         │  (worldpulse.db) │
                                         └────────┬─────────┘
                                                  │
                                         ┌────────▼─────────┐
                                         │  NewsData.io API │
                                         └──────────────────┘
```

| Layer      | Stack |
| ---------- | ----- |
| Frontend   | React 19, Vite, Tailwind CSS 4, react-globe.gl, Lucide |
| Backend    | FastAPI, SQLAlchemy, HTTPX, asyncio |
| Database   | SQLite (PostgreSQL-compatible URL supported) |
| News data  | [NewsData.io](https://newsdata.io) |

## Project structure

```
godiglobe/
├── backend/
│   ├── main.py           # API server and news ingestion
│   ├── countries.json    # Country metadata and coordinates
│   ├── states.json       # State/province metadata per country
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Globe and news UI
│   │   └── index.css
│   └── public/           # Static country/state JSON for the globe
└── README.md
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- A [NewsData.io](https://newsdata.io) API key

## Local development

### Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:

```env
DATABASE_URL=sqlite:///./worldpulse.db
NEWS_API_KEY=your_newsdata_io_key
```

Start the API:

```bash
uvicorn main:app --reload --port 8000
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

To point the UI at a remote API, set `VITE_API_URL` in `frontend/.env`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

## API reference

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/health` | Service health check |
| `GET` | `/news/{country}` | Cached news for a country. Optional query: `state` |
| `GET` | `/countries` | All supported countries with coordinates |
| `GET` | `/major-countries` | High-population countries used for globe labels |
| `GET` | `/states/{country}` | States/provinces for a country |
| `GET` | `/stats` | Article count, countries tracked, total states in dataset |

**Example**

```bash
curl "http://localhost:8000/news/India?state=Maharashtra"
```

News responses include a `status` field:

- `cached` — Results are current.
- `refreshing` — Stale cache returned; a background fetch is updating data. The frontend polls again automatically.

## Deployment

### Backend (Render)

1. Create a **Web Service** and connect this repository.
2. **Root directory:** `backend`
3. **Build command:** `pip install -r requirements.txt`
4. **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. **Environment variables:** `NEWS_API_KEY`, `DATABASE_URL`

### Frontend (Vercel)

1. Import the repository as a **Vite** project.
2. **Root directory:** `frontend`
3. **Environment variable:** `VITE_API_URL` → your deployed backend URL

## Environment variables

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `NEWS_API_KEY` | Yes | NewsData.io API key |
| `DATABASE_URL` | No | Defaults to `sqlite:///./worldpulse.db` |
| `VITE_API_URL` | No (frontend) | Backend base URL; defaults to `http://127.0.0.1:8000` |

## License

This project is provided as-is for educational and personal use. Add a license file if you plan to distribute or open-source formally.

---

Built by Aryan.
