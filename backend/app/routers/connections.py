# app/routers/connections.py

from fastapi import APIRouter, Depends, HTTPException, Body
from app.schemas.connection import ConnectionCreate, ConnectionOut
from app.deps.auth import get_current_user
from app.services.supabase_service import (
    create_connection_supabase,
    list_connections_supabase,
    activate_connection_supabase,
    delete_connection_supabase,
    get_active_connection_supabase,
    deactivate_connection_supabase,
)
from app.services.db_connector import get_table_names
from app.utils.crypto import encrypt_password
from typing import List
import pyodbc
import logging

router = APIRouter(
    prefix="/connections",
    tags=["connections"]
)

# ---- Testear conexión SQL Server (solo para pruebas rápidas) ----
@router.post("/test", response_model=dict)
def test_connection(params: ConnectionCreate = Body(...)):
    """
    Prueba una conexión a SQL Server. No guarda la conexión.
    """
    logging.info(f"[TEST_CONN] Intentando conexión DB: {params.db_type} host={params.host} db={params.database}")
    try:
        if params.db_type.lower() == "sqlserver":
            if "\\" in params.host:
                conn_str = (
                    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
                    f"SERVER={params.host};"
                    f"DATABASE={params.database};"
                    f"UID={params.username};PWD={params.password}"
                )
            else:
                conn_str = (
                    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
                    f"SERVER={params.host},{params.port};"
                    f"DATABASE={params.database};"
                    f"UID={params.username};PWD={params.password}"
                )
            with pyodbc.connect(conn_str, timeout=3) as connection:
                cursor = connection.cursor()
                cursor.execute("SELECT 1")
                cursor.fetchone()
            logging.info(f"[TEST_CONN] Conexión exitosa.")
            return {"success": True, "message": "Conexión exitosa"}
        else:
            msg = f"Motor no soportado: {params.db_type}"
            logging.warning(f"[TEST_CONN] {msg}")
            return {"success": False, "message": msg}
    except Exception as e:
        logging.error(f"[TEST_CONN] Falló: {e}")
        return {"success": False, "message": str(e)}

# ---- Guardar conexión (Supabase) ----
@router.post("/", response_model=ConnectionOut)
def create_connection(
    connection: ConnectionCreate,
    user=Depends(get_current_user)
):
    """
    Guarda una conexión en Supabase (encriptando la password).
    """
    logging.info(f"[CREATE_CONN] Usuario {user['user_id']} creando conexión: {connection.name} ({connection.db_type})")
    encrypted_password = encrypt_password(connection.password)
    data = {
        "user_id": str(user["user_id"]),
        "name": connection.name,
        "db_type": connection.db_type,
        "host": connection.host,
        "port": connection.port,
        "database": connection.database,
        "username": connection.username,
        "password": encrypted_password,
        "dictionary_table": getattr(connection, "dictionary_table", None),
        "data_dictionary": connection.data_dictionary,
    }
    try:
        result = create_connection_supabase(data, user["jwt"])
        logging.info(f"[CREATE_CONN] Guardado OK para usuario {user['user_id']}")
        return result
    except Exception as e:
        logging.error(f"[CREATE_CONN] Error guardando en Supabase: {e}")
        raise HTTPException(status_code=500, detail=f"Error guardando en Supabase: {str(e)}")

# ---- Listar conexiones ----
@router.get("/", response_model=List[ConnectionOut])
def list_connections(user=Depends(get_current_user)):
    """
    Lista todas las conexiones del usuario autenticado.
    """
    try:
        user_id = str(user["user_id"])
        jwt = user["jwt"]
        result = list_connections_supabase(user_id, jwt)
        logging.info(f"[LIST_CONNS] {len(result)} conexiones encontradas para usuario {user_id}")
        return result
    except Exception as e:
        logging.error(f"[LIST_CONNS] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error listando conexiones en Supabase: {str(e)}")

# ---- Activar una conexión ----
@router.post("/{connection_id}/activate", response_model=dict)
def activate_connection(
    connection_id: str,
    user=Depends(get_current_user)
):
    """
    Activa una conexión específica.
    """
    try:
        activate_connection_supabase(str(user["user_id"]), connection_id, user["jwt"])
        logging.info(f"[ACTIVATE_CONN] Usuario {user['user_id']} activó conexión {connection_id}")
        return {"success": True, "message": "Conexión activada"}
    except Exception as e:
        logging.error(f"[ACTIVATE_CONN] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error activando conexión: {str(e)}")

# ---- Desactivar la conexión activa ----
@router.post("/deactivate", response_model=dict)
def deactivate_connection(user=Depends(get_current_user)):
    """
    Desactiva la conexión activa.
    """
    try:
        deactivate_connection_supabase(str(user["user_id"]), user["jwt"])
        logging.info(f"[DEACTIVATE_CONN] Usuario {user['user_id']} desconectó conexión activa")
        return {"success": True, "message": "Conexión desactivada"}
    except Exception as e:
        logging.error(f"[DEACTIVATE_CONN] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error desactivando conexión: {str(e)}")

# ---- Eliminar una conexión ----
@router.delete("/{connection_id}", response_model=dict)
def delete_connection(
    connection_id: str,
    user=Depends(get_current_user)
):
    """
    Elimina una conexión por su ID.
    """
    try:
        delete_connection_supabase(str(user["user_id"]), connection_id, user["jwt"])
        logging.info(f"[DELETE_CONN] Usuario {user['user_id']} eliminó conexión {connection_id}")
        return {"success": True, "message": "Conexión eliminada"}
    except Exception as e:
        logging.error(f"[DELETE_CONN] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error eliminando conexión: {str(e)}")

# ---- Obtener la conexión activa ----
@router.get("/active", response_model=ConnectionOut)
def get_active_connection(user=Depends(get_current_user)):
    """
    Obtiene la conexión activa del usuario.
    """
    try:
        result = get_active_connection_supabase(str(user["user_id"]), user["jwt"])
        if not result:
            logging.warning(f"[GET_ACTIVE_CONN] Usuario {user['user_id']} sin conexión activa")
            raise HTTPException(status_code=404, detail="No hay conexión activa")
        logging.info(f"[GET_ACTIVE_CONN] Usuario {user['user_id']} obtuvo su conexión activa")
        return result
    except Exception as e:
        logging.error(f"[GET_ACTIVE_CONN] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error obteniendo conexión activa: {str(e)}")

# ---- Obtener lista de tablas de la conexión activa ----
@router.get("/tables", response_model=List[str])
def list_tables(user=Depends(get_current_user)):
    """
    Devuelve una lista de tablas de la base de datos de la conexión activa.
    """
    try:
        connection = get_active_connection_supabase(str(user["user_id"]), user["jwt"])
        if not connection:
            logging.warning(f"[LIST_TABLES] Usuario {user['user_id']} sin conexión activa")
            raise HTTPException(status_code=404, detail="No hay conexión activa")
        tables = get_table_names(dict(connection))
        logging.info(f"[LIST_TABLES] Usuario {user['user_id']} obtuvo tablas: {tables}")
        return tables
    except Exception as e:
        logging.error(f"[LIST_TABLES] Error: {e}")
        raise HTTPException(status_code=500, detail=f"Error listando tablas: {str(e)}")

# ---- Obtener tablas usando parámetros de conexión “ad hoc” ----
@router.post("/get-tables", response_model=List[str])
def get_tables_from_params(params: ConnectionCreate = Body(...)):
    """
    Recibe parámetros de conexión y retorna lista de tablas de esa DB.
    Ideal para probar conexión y cargar tablas antes de guardar.
    """
    try:
        tables = get_table_names(params.dict())
        logging.info(f"[GET_TABLES_ADHOC] Tablas obtenidas: {tables}")
        return tables
    except Exception as e:
        logging.error(f"[GET_TABLES_ADHOC] Error: {e}")
        raise HTTPException(status_code=400, detail=f"No se pudo obtener las tablas: {str(e)}")
