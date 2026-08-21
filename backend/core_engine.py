import os
import re
import pickle
import requests
import hashlib
import json
import time
from pathlib import Path

import faiss
import numpy as np

from dotenv import load_dotenv
from groq import Groq
from sentence_transformers import SentenceTransformer
from langchain_text_splitters import RecursiveCharacterTextSplitter


BASE_DIR = Path(__file__).resolve().parent

DOCUMENTS_DIR = BASE_DIR / "documents"
INDEX_PATH = BASE_DIR / "faiss.index"
CHUNKS_PATH = BASE_DIR / "chunks.pkl"
CACHE_FILE = BASE_DIR / "query_cache.json"

ENV_FILE = BASE_DIR / ".env"
load_dotenv(ENV_FILE)

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None
GROQ_MODEL = "groq/compound-mini"

OLLAMA_MODEL = "llama3.2:1b"
OLLAMA_URL = "http://localhost:11434/api/generate"

CACHE_TTL = 24 * 60 * 60  # 24 hours

embedding_model = None
index = None
chunks = []


def init_engine():
    global embedding_model, index, chunks
    print("Initializing RAG Engine...")
    embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    load_documents()
    index = build_faiss()
    print("RAG Engine Initialization Complete.")


def load_documents():
    global chunks
    if not DOCUMENTS_DIR.exists():
        DOCUMENTS_DIR.mkdir()

    files = list(DOCUMENTS_DIR.glob("*.txt"))
    if not files:
        chunks = []
        return

    chunks = []
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " ", ""]
    )

    for file_path in files:
        text = file_path.read_text(encoding="utf-8")
        document_name = file_path.stem
        year_match = re.search(r"(19|20)\d{2}", document_name)
        year = int(year_match.group()) if year_match else None

        split_texts = text_splitter.split_text(text)
        for chunk_text in split_texts:
            if chunk_text.strip():
                chunks.append({
                    "text": chunk_text.strip(),
                    "source": document_name,
                    "year": year,
                })


def build_faiss():
    global chunks, index
    if not chunks:
        return None

    if INDEX_PATH.exists() and CHUNKS_PATH.exists():
        loaded_index = faiss.read_index(str(INDEX_PATH))
        with open(CHUNKS_PATH, "rb") as f:
            chunks = pickle.load(f)
        return loaded_index

    texts = [item["text"] for item in chunks]
    embeddings = embedding_model.encode(texts, show_progress_bar=False)
    embeddings = np.asarray(embeddings, dtype="float32")
    dimension = embeddings.shape[1]

    loaded_index = faiss.IndexFlatL2(dimension)
    loaded_index.add(embeddings)
    faiss.write_index(loaded_index, str(INDEX_PATH))

    with open(CHUNKS_PATH, "wb") as f:
        pickle.dump(chunks, f)

    return loaded_index


def rebuild_index():
    global INDEX_PATH, CHUNKS_PATH
    if INDEX_PATH.exists():
        INDEX_PATH.unlink()
    if CHUNKS_PATH.exists():
        CHUNKS_PATH.unlink()
    load_documents()
    global index
    index = build_faiss()


def load_cache():
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}


def save_cache(cache_data):
    with open(CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache_data, f, indent=4)


def check_cache(question):
    cache = load_cache()
    q_hash = hashlib.sha256(question.lower().strip().encode()).hexdigest()
    
    if q_hash in cache:
        entry = cache[q_hash]
        current_time = time.time()
        if current_time - entry["timestamp"] <= CACHE_TTL:
            return entry["answer"], q_hash
        else:
            del cache[q_hash]
            save_cache(cache)
    return None, q_hash


def add_to_cache(question, answer):
    cache = load_cache()
    q_hash = hashlib.sha256(question.lower().strip().encode()).hexdigest()
    cache[q_hash] = {
        "answer": answer,
        "timestamp": time.time()
    }
    save_cache(cache)


def search_documents(question, k=5):
    if not index or not chunks:
        return []
    question_embedding = embedding_model.encode([question], show_progress_bar=False)
    question_embedding = np.asarray(question_embedding, dtype="float32")
    actual_k = min(k, len(chunks))
    distances, indices = index.search(question_embedding, actual_k)
    results = []
    for i in range(actual_k):
        idx = int(indices[0][i])
        result = chunks[idx].copy()
        result["distance"] = float(distances[0][i])
        results.append(result)
    return results


def extract_numeric_claims(text):
    pattern = r"(\d+(?:\.\d+)?)\s*(ml|millilitres?|mg|grams?|g)(?:\s*/\s*(kg|hour|day))?(?:\s*/\s*(hour|day))?"
    matches = re.findall(pattern, text.lower())
    values = []
    for match in matches:
        number, unit, den1, den2 = float(match[0]), match[1], match[2], match[3]
        normalized = f"{number:g} {unit}"
        if den1: normalized += f"/{den1}"
        if den2: normalized += f"/{den2}"
        values.append({"value": number, "claim": normalized})
    return values


def detect_conflicts(results):
    conflicts = []
    for i in range(len(results)):
        for j in range(i + 1, len(results)):
            a, b = results[i], results[j]
            if a["source"] == b["source"]: continue
            claims_a = extract_numeric_claims(a["text"])
            claims_b = extract_numeric_claims(b["text"])
            for claim_a in claims_a:
                for claim_b in claims_b:
                    if claim_a["value"] != claim_b["value"]:
                        conflicts.append({
                            "source_a": a["source"], "year_a": a["year"], "claim_a": claim_a["claim"],
                            "source_b": b["source"], "year_b": b["year"], "claim_b": claim_b["claim"],
                        })
    return conflicts


def format_conflict_response(conflicts):
    res = ["⚠️ SOURCES DISAGREE — I WILL NOT GUESS.\n"]
    for c in conflicts:
        res.append(f"📄 {c['source_a']} ({c['year_a']}): {c['claim_a']}\n📄 {c['source_b']} ({c['year_b']}): {c['claim_b']}\n")
    res.append("These sources contain conflicting values. Please verify authorized guidance.")
    return "\n".join(res)


def internet_available():
    try:
        requests.get("https://api.groq.com", timeout=3)
        return True
    except Exception:
        return False


def ask_groq(question, results):
    if not groq_client:
        raise ValueError("GROQ_API_KEY not configured")
    context = "\n".join([f"SOURCE: {r['source']}\nYEAR: {r['year']}\n{r['text']}" for r in results])
    prompt = f"Answer ONLY from the sources.\n\nUser: {question}\n\nSources:\n{context}\n\nDo not invent facts."
    res = groq_client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": "You are a careful document-grounded assistant."},
            {"role": "user", "content": prompt}
        ],
        temperature=0
    )
    return res.choices[0].message.content


def ask_ollama(question, results):
    context = "\n".join([f"SOURCE: {r['source']}\n{r['text']}" for r in results])
    prompt = f"Answer from the context.\nQuestion: {question}\nContext:\n{context}\nKeep it short."
    res = requests.post(OLLAMA_URL, json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False}, timeout=30)
    res.raise_for_status()
    return res.json()["response"]


def process_query(question: str):
    cached_answer, q_hash = check_cache(question)
    if cached_answer:
        return {
            "answer": cached_answer,
            "mode": "cache",
            "cached": True,
            "hash": q_hash,
            "conflicts": [],
            "sources": []
        }

    results = search_documents(question, k=5)
    conflicts = detect_conflicts(results)

    if conflicts:
        answer = format_conflict_response(conflicts)
        return {
            "answer": answer,
            "mode": "conflict",
            "cached": False,
            "hash": q_hash,
            "conflicts": conflicts,
            "sources": results
        }

    if internet_available() and groq_client:
        try:
            answer = ask_groq(question, results)
            mode = "online"
        except Exception as error:
            print(f"Groq failed: {error}")
            try:
                answer = ask_ollama(question, results)
                mode = "offline-fallback"
            except Exception:
                answer = "Error generating response from LLM provider."
                mode = "error"
    else:
        try:
            answer = ask_ollama(question, results)
            mode = "offline"
        except Exception:
            answer = "Offline model unavailable and no internet connection."
            mode = "offline-error"

    if mode in ["online", "offline", "offline-fallback"]:
        add_to_cache(question, answer)

    return {
        "answer": answer,
        "mode": mode,
        "cached": False,
        "hash": q_hash,
        "conflicts": [],
        "sources": results
    }
