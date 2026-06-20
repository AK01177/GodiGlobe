# GoDiGlobe 🌍

**AI-Powered World News Intelligence Platform**

GoDiGlobe is an interactive, 3D Globe-based news application that fetches real-time articles from around the world and summarizes them using HuggingFace's DistilBART-CNN AI model.

## 🚀 Extreme Architecture
This project has been deliberately refactored into the ultimate expression of **functional minimalism** and **code-golf condensation**:
- **Backend (`main.py`)**: The entire FastAPI application, asynchronous HTTPX logic, SQLAlchemy ORM mappings, parallel AI summarization (`asyncio.gather`), and background caching are compressed into a single `~65 line` file.
- **Frontend (`App.jsx`)**: The entire React application, including the 3D WebGL Globe, dynamic Sidebar, News mapping logic, and complex state management are housed inside a single `~45 line` file using strict memoization to ensure perfectly smooth 60 FPS performance.

## 🛠️ Tech Stack
- **Frontend**: React, react-globe.gl, TailwindCSS, Vite
- **Backend**: Python, FastAPI, SQLite (SQLAlchemy), HTTPX
- **AI/APIs**: HuggingFace Inference API (Summarization), NewsData.io API (News Source)

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

## 🧠 How it Works
1. When you select a country (or state) on the 3D Globe, the frontend requests news from the backend API.
2. The backend fetches live URLs from NewsData.io asynchronously.
3. The backend concurrently passes every article to HuggingFace for rapid AI summarization.
4. Data is cached seamlessly via background tasks, immediately updating the virtual DOM while keeping the 3D render thread unblocked.
