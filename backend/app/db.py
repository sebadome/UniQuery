import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Carga las variables de entorno del archivo .env
load_dotenv()

# Obtiene la URL de la base de datos desde la variable de entorno
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL no está definida en el entorno. Revisa tu .env")

# Crea el engine de SQLAlchemy usando la URL de la base de datos
engine = create_engine(DATABASE_URL, pool_pre_ping=True)  # pool_pre_ping=True ayuda a evitar desconexiones por timeout
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependencia para obtener la sesión de base de datos en FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
