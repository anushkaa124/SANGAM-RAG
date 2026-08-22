import sys
import shutil
from pathlib import Path
from typing import List

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from backend import core_engine
except ImportError:
    import core_engine

app = FastAPI(
    title="SangamRAG Healthcare AI API",
    description="Backend API for Document-Grounded RAG with Conflict Detection & Caching",
    version="1.0.0"
)

# CORS configuration for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QuestionRequest(BaseModel):
    question: str


@app.on_event("startup")
def startup_event():
    core_engine.init_engine()


@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "SangamRAG Backend API",
        "documents_count": len(list(core_engine.DOCUMENTS_DIR.glob("*.txt"))),
        "total_chunks": len(core_engine.chunks)
    }


@app.post("/ask")
def ask_question(payload: QuestionRequest):
    if not payload.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")
    
    result = core_engine.process_query(payload.question)
    return result


@app.get("/documents")
def get_documents():
    docs = []
    for file in core_engine.DOCUMENTS_DIR.glob("*.txt"):
        docs.append({
            "name": file.name,
            "size_bytes": file.stat().st_size
        })
    return {
        "documents": docs,
        "total_chunks": len(core_engine.chunks)
    }


@app.post("/upload")
async def upload_documents(files: List[UploadFile] = File(...)):
    uploaded_names = []
    for file in files:
        if not file.filename.endswith(".txt"):
            continue
        dest_path = core_engine.DOCUMENTS_DIR / file.filename
        with dest_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        uploaded_names.append(file.filename)
    
    # Rebuild FAISS index with new documents
    core_engine.rebuild_index()
    
    return {
        "message": f"Successfully uploaded {len(uploaded_names)} document(s). Index rebuilt.",
        "files": uploaded_names,
        "total_chunks": len(core_engine.chunks)
    }


@app.delete("/cache")
def clear_cache():
    if core_engine.CACHE_FILE.exists():
        core_engine.CACHE_FILE.unlink()
    return {"message": "Query cache cleared successfully."}
