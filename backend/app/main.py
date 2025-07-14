# backend/app/main.py

from dotenv import load_dotenv
load_dotenv()  # Carga variables de entorno al inicio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importa routers propios del proyecto
from app.routers import connections
from app.routers import queries     # El endpoint /human_query
from app.routers import feedback    # Endpoints para feedback (like/dislike/comentarios)

app = FastAPI(
    title="DatabaseQueryMaster API",
    version="0.1.0",
    description="API para gestión de conexiones y consultas a bases de datos SQL usando LLM."
)

# --- Middleware CORS ---
# En producción: Cambia allow_origins por el dominio real de tu frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            # Cambia esto por ["https://tu-frontend.com"] en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Registro de routers (sin prefix global, cada uno tiene su propio prefix) ---
app.include_router(connections.router)
app.include_router(queries.router)
app.include_router(feedback.router)

# --- Endpoints básicos ---
@app.get("/")
def root():
    return {"message": "Backend operativo!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

# Fin del archivo: sin cambios destructivos, mantiene compatibilidad total
