# app/services/query_logger.py

from datetime import datetime
from typing import Optional, Any, Dict
from sqlalchemy import create_engine, Table, MetaData
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import SQLAlchemyError
import os
import logging
import json

# Mejor compatibilidad: permite SUPABASE_DB_URL o DATABASE_URL
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")

if not SUPABASE_DB_URL:
    raise ValueError(
        "No se encontró la variable de entorno SUPABASE_DB_URL ni DATABASE_URL. "
        "Por favor, agrégala en tu .env."
    )
else:
    print("URL de conexión a base de datos cargada:", SUPABASE_DB_URL)

# Crea el engine SQLAlchemy
engine = create_engine(SUPABASE_DB_URL)
metadata = MetaData()
query_logs = Table("query_logs", metadata, autoload_with=engine, schema="public")

def log_query_attempt(data: Dict[str, Any]) -> Optional[int]:
    """
    Registra un intento de consulta (éxito o fallo) en la tabla query_logs.
    Devuelve el ID del log creado, o None si falló.
    """
    allowed_fields = {col.name for col in query_logs.columns}
    record = {}

    # Serializa objetos complejos a JSON si es necesario
    for k, v in data.items():
        if k in allowed_fields:
            if k in ["llm_raw_request", "llm_raw_response", "sql_raw_result"]:
                try:
                    # Evita doble serialización si ya es string
                    if v is not None and not isinstance(v, str):
                        record[k] = json.dumps(v, ensure_ascii=False)
                    else:
                        record[k] = v
                except Exception:
                    record[k] = None
            elif k == "columns" and v is not None and not isinstance(v, list):
                # Para columnas si vienen como string (por error)
                try:
                    record[k] = json.loads(v)
                except Exception:
                    record[k] = None
            else:
                record[k] = v

    # Asegura campos obligatorios
    if "created_at" not in record:
        record["created_at"] = datetime.utcnow()
    if "updated_at" not in record:
        record["updated_at"] = datetime.utcnow()

    try:
        with engine.begin() as conn:
            result = conn.execute(
                pg_insert(query_logs).values(**record).returning(query_logs.c.id)
            )
            inserted_id = result.scalar()
            logging.info(f"[QUERY_LOGGER] Log insertado en query_logs con ID {inserted_id}")
            return inserted_id
    except SQLAlchemyError as e:
        logging.error(f"[QUERY_LOGGER] Error registrando log: {e}")
        return None
