# app/services/query_logger.py

import os
import json
import logging
from datetime import datetime
from typing import Optional, Any, Dict

from sqlalchemy import create_engine, Table, MetaData
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.exc import SQLAlchemyError

# --- Compatibilidad con SUPABASE_DB_URL o DATABASE_URL ---
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")
if not SUPABASE_DB_URL:
    raise ValueError(
        "No se encontró la variable de entorno SUPABASE_DB_URL ni DATABASE_URL. "
        "Por favor, agrégala en tu .env."
    )
else:
    print("URL de conexión a base de datos cargada:", SUPABASE_DB_URL)

# --- Inicializa SQLAlchemy ---
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

    # Serializa objetos complejos (dict, list) y convierte campos según tipo
    for k, v in data.items():
        if k not in allowed_fields:
            continue

        # --- Manejo especial para campos JSONB ---
        if k in ["llm_raw_request", "llm_raw_response", "sql_raw_result"]:
            if v is None:
                record[k] = None
            elif isinstance(v, (dict, list)):
                record[k] = json.dumps(v, ensure_ascii=False)
            elif isinstance(v, str):
                try:
                    # Si ya es string JSON válido, se guarda directo
                    json.loads(v)
                    record[k] = v
                except Exception:
                    record[k] = json.dumps({"raw": v}, ensure_ascii=False)
            else:
                record[k] = json.dumps({"value": v}, ensure_ascii=False)

        # --- columns: debe ser lista (postgres array de texto) ---
        elif k == "columns":
            if v is None:
                record[k] = None
            elif isinstance(v, list):
                record[k] = [str(col) for col in v]
            elif isinstance(v, str):
                try:
                    arr = json.loads(v)
                    if isinstance(arr, list):
                        record[k] = [str(col) for col in arr]
                    else:
                        record[k] = [str(arr)]
                except Exception:
                    record[k] = [v]
            else:
                record[k] = [str(v)]

        # --- Manejo normal para otros campos ---
        else:
            record[k] = v

    # --- Asigna timestamps obligatorios si faltan ---
    now_utc = datetime.utcnow()
    if "created_at" not in record or not record["created_at"]:
        record["created_at"] = now_utc
    if "updated_at" not in record or not record["updated_at"]:
        record["updated_at"] = now_utc

    try:
        with engine.begin() as conn:
            result = conn.execute(
                pg_insert(query_logs).values(**record).returning(query_logs.c.id)
            )
            inserted_id = result.scalar()
            logging.info(f"[QUERY_LOGGER] Log insertado en query_logs con ID {inserted_id}")
            return inserted_id
    except SQLAlchemyError as e:
        logging.error(f"[QUERY_LOGGER] Error registrando log: {e}\nData: {data}")
        return None
