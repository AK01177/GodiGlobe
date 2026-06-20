# 🌍 GodiGlobe

A full-stack news intelligence platform featuring a 3D interactive globe for geographic news exploration. Built with React, Globe.gl, FastAPI, SQLite, and Hugging Face Transformers for AI-powered news summarization.

![GodiGlobe](https://img.shields.io/badge/GodiGlobe-v3-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.137-009688?style=flat-square&logo=fastapi)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite)
![HuggingFace](https://img.shields.io/badge/HuggingFace-Transformers-FFD21E?style=flat-square&logo=huggingface)

---

## 🚀 Extreme Architecture (Code-Golfed)
This project has been deliberately refactored into the ultimate expression of **functional minimalism** and **code-golf condensation**:
- **Backend (`main.py`)**: The entire FastAPI application, asynchronous HTTPX logic, SQLAlchemy ORM mappings, parallel AI summarization (`asyncio.gather`), and background caching are compressed into a single **`~65 line`** file.
- **Frontend (`App.jsx`)**: The entire React application, including the 3D WebGL Globe, dynamic Sidebar, News mapping logic, and complex state management are housed inside a single **`~45 line`** file using strict memoization to ensure perfectly smooth 60 FPS performance.

---

## 🛠️ Tech Stack
| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React, TailwindCSS, Globe.gl        |
| Backend  | FastAPI, SQLAlchemy                 |
| Database | SQLite                              |
| AI       | Hugging Face Inference (DistilBART) |
| News     | NewsData.io API                     |

---

## 📦 Deployment

### Frontend (Vercel)
1. Sign up on [Vercel](https://vercel.com) and link your GitHub account.
2. Click **Add New > Project** and select your `GodiGlobe` repository.
3. Edit the **Framework Preset** to `Vite`.
4. Set the **Root Directory** to `frontend`.
5. Under Environment Variables, add `VITE_API_URL` pointing to your Render Backend URL (e.g., `https://godiglobe-api.onrender.com`).
6. Click **Deploy**.

### Backend (Render)
1. Sign up on [Render.com](https://render.com) and link your GitHub account.
2. Click **New > Web Service** and select your `GodiGlobe` repository.
3. Set the **Root Directory** to `backend`.
4. Set **Build Command**: `pip install -r requirements.txt`
5. Set **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Under Environment Variables, add:
   - `NEWS_API_KEY`: Your NewsData.io API Key
   - `HF_API_KEY`: Your HuggingFace API Key
   - `DATABASE_URL`: `sqlite:///./worldpulse.db`
7. Click **Create Web Service**.

---

## 📦 Local Setup

### 1. Backend Setup
Navigate to the `backend` directory and set up your Python environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file in the `backend` directory with your API keys:
```env
DATABASE_URL=sqlite:///./worldpulse.db
NEWS_API_KEY=your_newsdata_io_key
HF_API_KEY=your_huggingface_key
```

Run the API:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup
Navigate to the `frontend` directory and install the Node dependencies:
```bash
cd frontend
npm install
```

Start the Vite development server:
```bash
npm run dev
```

---

## Resume Description

> Developed GodiGlobe, a full-stack news intelligence platform featuring a 3D interactive globe for geographic news exploration. Built with an extreme code-golfed minimalist architecture comprising a 45-line React/Globe.gl frontend and a 65-line asynchronous FastAPI backend. Implemented fully non-blocking IO using `httpx` and `asyncio.gather` for real-time parallel news fetching and HuggingFace DistilBART summarization, achieving flawless 60 FPS performance and extreme scalability.

---

**Built with ❤️ by Aryan**
