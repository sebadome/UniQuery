# backend/app/main.py

from dotenv import load_dotenv
load_dotenv()  # Carga variables de entorno al inicio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importa routers
from app.routers import connections
from app.routers import queries     # El endpoint /human_query
from app.routers import feedback    # Endpoints para feedback (like/dislike/comentarios)

app = FastAPI(
    title="DatabaseQueryMaster API",
    version="0.1.0",
    description="API para gestión de conexiones y consultas a bases de datos SQL usando LLM."
)

# --- Middleware CORS ---
# En producción: Cambia allow_origins por el dominio de tu frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],            # Cambia esto por ["https://tu-frontend.com"] en PROD
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Registro de routers ---
# No uses prefix aquí (cada router tiene su propio prefix)
app.include_router(connections.router)
app.include_router(queries.router)
app.include_router(feedback.router)

@app.get("/")
def root():
    return {"message": "Backend operativo!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
