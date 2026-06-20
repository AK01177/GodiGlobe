# 🌍 GodiGlobe

A full-stack, AI-powered news intelligence platform featuring an interactive 3D globe for geographic news exploration. Built with React, FastAPI, SQLite, and Hugging Face Transformers for real-time news aggregation, intelligent deduplication, and automated summarization.

![GodiGlobe](https://img.shields.io/badge/GodiGlobe-v3-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.137-009688?style=flat-square&logo=fastapi)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)
![HuggingFace](https://img.shields.io/badge/HuggingFace-Transformers-FFD21E?style=flat-square&logo=huggingface)

---

## ✨ Key Features

- **Interactive 3D Visualization**: Explore global news dynamically by interacting with a high-performance WebGL 3D globe.
- **AI-Driven Summarization**: Leverages Hugging Face's DistilBART model to generate concise summaries of complex news articles in real-time.
- **Smart Deduplication Engine**: Automatically identifies and groups identical news stories reported by different sources, providing a clean and unified feed.
- **Strict Location Targeting**: Ensures news accuracy by strictly enforcing location-based query parameters.
- **Asynchronous Architecture**: Built on a non-blocking `httpx` and `asyncio` foundation to execute parallel API requests and database operations efficiently.

---

## 🛠️ Tech Stack

| Component    | Technology                          |
| ------------ | ----------------------------------- |
| **Frontend** | React, TailwindCSS, Globe.gl, Vite  |
| **Backend**  | FastAPI, SQLAlchemy, HTTPX, asyncio |
| **Database** | SQLite                              |
| **AI / NLP** | Hugging Face API (DistilBART-CNN)   |
| **Data API** | NewsData.io                         |

---

## 📦 Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- API Keys for NewsData.io and Hugging Face.

### 1. Backend Configuration
Navigate to the `backend` directory and set up the Python environment:

```bash
cd backend
python -m venv venv

# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory:
```env
DATABASE_URL=sqlite:///./worldpulse.db
NEWS_API_KEY=your_newsdata_io_key
HF_API_KEY=your_huggingface_key
```

Start the FastAPI server:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend Configuration
In a new terminal, navigate to the `frontend` directory:

```bash
cd frontend
npm install
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## 🚀 Deployment Guide

### Deploying the Backend (Render.com)
1. Log into [Render](https://render.com) and create a **New Web Service**.
2. Connect your GitHub repository.
3. **Root Directory**: `backend`
4. **Build Command**: `pip install -r requirements.txt`
5. **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add your Environment Variables (`NEWS_API_KEY`, `HF_API_KEY`, `DATABASE_URL`).
7. Deploy the service and copy the generated URL.

### Deploying the Frontend (Vercel)
1. Log into [Vercel](https://vercel.com) and create a **New Project**.
2. Import your GitHub repository.
3. **Framework Preset**: `Vite`
4. **Root Directory**: `frontend`
5. Add an Environment Variable named `VITE_API_URL` and set its value to your Render backend URL.
6. Deploy the application.

---

## 📋 API Overview

| Method | Endpoint          | Description                                            |
| ------ | ----------------- | ------------------------------------------------------ |
| `GET`  | `/news/{country}` | Fetches deduplicated, AI-summarized news for a region. |
| `GET`  | `/countries`      | Returns geospatial tracking data for countries.        |
| `GET`  | `/states/{country}`| Returns regional state data.                           |
| `GET`  | `/stats`          | Aggregates global tracking statistics.                 |

---

**Built with ❤️ by Aryan**
