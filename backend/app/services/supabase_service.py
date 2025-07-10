# services/supabase_service.py

import os
import requests
from typing import Dict, Any, List, Optional

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_URL o SUPABASE_ANON_KEY no definidas en el entorno. Revisa tu .env")

SUPABASE_TABLE = "connections"
SUPABASE_ACTIVE_TABLE = "active_connections"

def supabase_headers(user_token: str, prefer: str = None) -> Dict[str, str]:
    if not user_token:
        raise ValueError("Token de usuario no proporcionado")
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {user_token}",
        "Content-Type": "application/json"
    }
    if prefer:
        headers["Prefer"] = prefer
    return headers

def create_connection_supabase(data: Dict[str, Any], user_token: str) -> Dict[str, Any]:
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}"
    resp = requests.post(
        url,
        headers=supabase_headers(user_token, prefer="return=representation"),
        json=[data]
    )
    if not resp.ok:
        print(f"[Supabase] Error al guardar conexión: {resp.status_code} {resp.text}")
        raise Exception(f"Error al guardar conexión en Supabase: {resp.text}")
    result = resp.json()[0]
    result.setdefault("dictionary_table", None)
    result.setdefault("data_dictionary", None)
    return result

def list_connections_supabase(user_id: str, user_token: str) -> List[Dict[str, Any]]:
    if not user_id or not user_token:
        raise ValueError("user_id y user_token son requeridos")
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}?user_id=eq.{user_id}"
    print(">>> DEBUG URL SUPABASE connections:", url)
    resp = requests.get(url, headers=supabase_headers(user_token))
    print(">>> DEBUG STATUS CODE SUPABASE:", resp.status_code)
    print(">>> DEBUG RESP TEXT:", resp.text)
    if not resp.ok:
        print(f"[Supabase] Error al listar conexiones: {resp.status_code} {resp.text}")
        raise Exception(f"Error al listar conexiones en Supabase: {resp.text}")
    conexiones = resp.json()
    print(">>> DEBUG conexiones crudas recibidas:", conexiones)
    for c in conexiones:
        c.setdefault("dictionary_table", None)
        c.setdefault("data_dictionary", None)
    # Obtener la conexión activa
    active_url = (
        f"{SUPABASE_URL}/rest/v1/{SUPABASE_ACTIVE_TABLE}"
        f"?user_id=eq.{user_id}&select=connection_id"
    )
    resp_active = requests.get(active_url, headers=supabase_headers(user_token))
    if not resp_active.ok:
        print(f"[Supabase] Error al buscar conexión activa: {resp_active.status_code} {resp_active.text}")
        raise Exception(f"Error al buscar conexión activa: {resp_active.text}")
    results = resp_active.json()
    active_connection_id = results[0]["connection_id"] if results and results[0].get("connection_id") else None
    for c in conexiones:
        c["isActive"] = (str(c["id"]) == str(active_connection_id))
    return conexiones

# --- (El resto igual) ---

def get_connection_supabase(connection_id: str, user_id: str, user_token: str) -> Optional[Dict[str, Any]]:
    if not connection_id or not user_id or not user_token:
        raise ValueError("connection_id, user_id y user_token son requeridos")
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}?id=eq.{connection_id}&user_id=eq.{user_id}"
    resp = requests.get(url, headers=supabase_headers(user_token))
    if not resp.ok:
        print(f"[Supabase] Error al obtener conexión: {resp.status_code} {resp.text}")
        raise Exception(f"Error al obtener conexión en Supabase: {resp.text}")
    results = resp.json()
    if results:
        results[0].setdefault("dictionary_table", None)
        results[0].setdefault("data_dictionary", None)
        return results[0]
    return None

def activate_connection_supabase(user_id: str, connection_id: str, user_token: str) -> None:
    if not user_id or not connection_id or not user_token:
        raise ValueError("user_id, connection_id y user_token son requeridos")
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_ACTIVE_TABLE}"
    data = {
        "user_id": user_id,
        "connection_id": connection_id,
    }
    resp = requests.post(
        url,
        headers=supabase_headers(user_token, prefer="resolution=merge-duplicates,return=representation"),
        json=[data]
    )
    if not resp.ok:
        print(f"[Supabase] Error al activar conexión: {resp.status_code} {resp.text}")
        raise Exception(f"Error al activar conexión en Supabase: {resp.text}")

def deactivate_connection_supabase(user_id: str, user_token: str) -> None:
    if not user_id or not user_token:
        raise ValueError("user_id y user_token son requeridos")
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_ACTIVE_TABLE}?user_id=eq.{user_id}"
    resp = requests.delete(url, headers=supabase_headers(user_token))
    if not resp.ok:
        print(f"[Supabase] Error al desactivar conexión: {resp.status_code} {resp.text}")
        raise Exception(f"Error al desactivar conexión en Supabase: {resp.text}")

def delete_connection_supabase(user_id: str, connection_id: str, user_token: str) -> None:
    if not user_id or not connection_id or not user_token:
        raise ValueError("user_id, connection_id y user_token son requeridos")
    url = f"{SUPABASE_URL}/rest/v1/{SUPABASE_TABLE}?id=eq.{connection_id}&user_id=eq.{user_id}"
    resp = requests.delete(url, headers=supabase_headers(user_token))
    if not resp.ok:
        print(f"[Supabase] Error al eliminar conexión: {resp.status_code} {resp.text}")
        raise Exception(f"Error al eliminar conexión en Supabase: {resp.text}")

def get_active_connection_supabase(user_id: str, user_token: str) -> Optional[Dict[str, Any]]:
    if not user_id or not user_token:
        raise ValueError("user_id y user_token son requeridos")
    url = (
        f"{SUPABASE_URL}/rest/v1/{SUPABASE_ACTIVE_TABLE}"
        f"?user_id=eq.{user_id}&select=connection_id"
    )
    resp = requests.get(url, headers=supabase_headers(user_token))
    if not resp.ok:
        print(f"[Supabase] Error al buscar conexión activa: {resp.status_code} {resp.text}")
        raise Exception(f"Error al buscar conexión activa: {resp.text}")

    results = resp.json()
    if not results or not results[0].get("connection_id"):
        return None

    connection_id = results[0]["connection_id"]
    return get_connection_supabase(connection_id, user_id, user_token)

def get_active_connection_for_user(user_id: str, user_token: str) -> Optional[Dict[str, Any]]:
    """
    Obtiene la conexión activa para el usuario (la que se usa para preguntas LLM).
    Incluye campos extra relevantes.
    """
    return get_active_connection_supabase(user_id, user_token)
