import os
import openai
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple

# --- Logging configuration ---
LOG_FILE = os.path.join(os.path.dirname(__file__), '../../logs_llm.txt')
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s:%(name)s:%(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler()
    ]
)

def append_log_file(log_text: str):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(log_text.strip() + "\n")

OPENAI_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_KEY:
    raise RuntimeError("OPENAI_API_KEY no definida en el entorno. Revisa tu .env")
openai.api_key = OPENAI_KEY

def get_current_date() -> str:
    """Devuelve la fecha actual en formato DD/MM/AAAA."""
    return datetime.now().strftime("%d/%m/%Y")

# --------- Ayudante para detectar preguntas de conteo de columnas ----------
def is_count_columns_question(question: str) -> Optional[str]:
    """
    Detecta si la pregunta es sobre el número de columnas en una tabla y extrae el nombre de la tabla.
    Retorna el nombre de la tabla si aplica, si no retorna None.
    """
    import re
    patrones = [
        r"(?:cu[aá]ntas?|n[uú]mero de) columnas (?:tiene|hay en) (?:la tabla )?'?(\w+)'?",
        r"columnas de (?:la tabla )?'?(\w+)'?"
    ]
    for pat in patrones:
        match = re.search(pat, question, re.IGNORECASE)
        if match:
            return match.group(1)
    return None

def call_openai_generate_sql(
    question: str,
    schema: str,
    data_dictionary: Optional[dict] = None,
    db_type: str = "",
    dictionary_table: Optional[str] = None,
    user_email: Optional[str] = None,
    return_metadata: bool = False
) -> Tuple[Optional[str], Dict[str, Any]]:
    """
    Envía una pregunta al modelo LLM para generar una consulta SQL segura y la estructura visual asociada.
    Retorna:
        (sql_query (str | None), metadata (dict))
        Si solo se trata de saludo/presentación, retorna (None, meta) con clave "info".
        Si ocurre error, retorna (None, meta) con clave "error".
    """
    if not user_email:
        user_email = "usuario"

    log_prefix = f"[USER: {user_email}] [PREGUNTA] {question}"

    append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Usuario: {user_email} | Pregunta: {question}")
    append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {log_prefix} | Pregunta humana recibida.")

    dict_msg = ""
    if data_dictionary and isinstance(data_dictionary, dict) and dictionary_table:
        dict_lines = [f"{col}: {desc}" for col, desc in data_dictionary.items()]
        dict_msg = (
            f"\n<diccionario_de_datos_tabla nombre='{dictionary_table}'>\n"
            + "\n".join(dict_lines)
            + f"\n</diccionario_de_datos_tabla>"
        )
    elif data_dictionary and isinstance(data_dictionary, dict):
        dict_lines = [f"{col}: {desc}" for col, desc in data_dictionary.items()]
        dict_msg = (
            f"\n<diccionario_de_datos>\n"
            + "\n".join(dict_lines)
            + "\n</diccionario_de_datos>"
        )

    # ----------- PATRÓN: pregunta sobre el número de columnas de una tabla -----------
    table_for_count = is_count_columns_question(question)
    if table_for_count:
        # Construye la consulta SQL correcta dependiendo de la base de datos
        if db_type.lower() in ("postgres", "postgresql"):
            sql_query = (
                f"SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '{table_for_count}';"
            )
        elif db_type.lower() == "sqlserver":
            sql_query = (
                f"SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{table_for_count}';"
            )
        else:
            sql_query = (
                f"SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '{table_for_count}';"
            )
        meta = {
            "sql_query": sql_query,
            "force_count_columns_message": True,
            "table_name": table_for_count,
            "raw_prompt": "NO LLM - Respuesta generada por backend para conteo de columnas"
        }
        return sql_query, meta

    # ---------- PROMPT LLM (ESPAÑOL, robusto para gráficos y JSON estructurado) ----------
    system_message = f"""
Eres un asistente experto en transformar preguntas en lenguaje natural a consultas SQL SEGURAS y en sugerir la mejor visualización posible según los resultados.

Siempre debes responder SOLO con un JSON estructurado, nunca con texto fuera del JSON.
Estructura estándar de tu respuesta (incluir solo lo que aplica):

{{
  "sql_query": "Consulta SQL generada",
  "table": [["Col1", "Col2"], ["valor1", "valor2"], ...],    // Matriz para mostrar tabla (cabecera + filas)
  "list": ["valor1", "valor2", ...],                        // Solo si aplica lista simple
  "chart": {{
    "type": "bar|pie|line|doughnut|scatter",                // Tipo sugerido (elige el más adecuado)
    "labels": ["etiqueta1", "etiqueta2", ...],              // Eje X/categorías/fechas
    "values": [10, 20, ...]                                 // Eje Y/valores asociados
  }},
  "message": "Explicación corta y clara en español"
}}

- Usa solo estos tipos de gráficos en "chart.type": "bar", "pie", "line", "doughnut", "scatter"
- Si la pregunta es de series de tiempo, usa preferentemente "line".
- Si es agrupación/categoría, sugiere "bar", "pie" o "doughnut" según convenga.
- Si es de correlación o pares de valores, sugiere "scatter".
- El campo "chart" es opcional, solo inclúyelo si la consulta lo permite.
- El campo "list" es opcional, solo si es relevante.
- El campo "table" es opcional, pero siempre incluye si la respuesta es tabular.
- El campo "message" SIEMPRE debe estar cuando haya datos, como explicación para un usuario no técnico.
- Si la pregunta es solo un saludo o no tiene sentido para SQL, responde SOLO con este JSON (sin ningún otro campo):

{{
  "info": "¡Hola! Soy tu asistente. Pregúntame sobre tus datos o la base de datos para comenzar."
}}

IMPORTANTE:
- Nunca inventes valores, nunca muestres ejemplos, nunca inventes números ni filas: siempre ejecuta la consulta SQL propuesta y muestra los resultados REALES de la base de datos, sin modificar, resumir o simular.
- Para preguntas como "¿cuántos registros hay en la tabla X?", debes devolver la consulta SQL correspondiente y mostrar el resultado real.
- Si el usuario pide "muestra la tabla X", limita a 100 filas usando LIMIT 100, y aclara en el message que se está mostrando solo una parte de los datos si la tabla es muy grande.
- Usa nombres de tablas y campos EXACTAMENTE como aparecen en el esquema.
- Si la pregunta requiere información sobre la estructura de la tabla (como cantidad o nombres de columnas/tablas), puedes usar tablas del sistema como information_schema.columns, information_schema.tables, sys.tables, pg_catalog.pg_tables, etc.
- Si el usuario **no menciona una tabla**, asume que debe usarse la tabla seleccionada: '{dictionary_table}'.
- Prohíbe consultas peligrosas (DELETE, DROP, ALTER, TRUNCATE, UPDATE, INSERT, CREATE, REPLACE, GRANT, REVOKE, EXEC, COMMIT, ROLLBACK).

Hoy es {get_current_date()}.

{dict_msg}

<schema>
{schema}
</schema>
"""
    user_message = question

    append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {log_prefix} | Prompt enviado a OpenAI (system/user)")

    try:
        import time
        t0 = time.time()
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message},
            ],
            max_tokens=800,
            temperature=0.1,
            response_format={"type": "json_object"}
        )
        t1 = time.time()
        elapsed_ms = int((t1 - t0) * 1000)
        content = response.choices[0].message.content
        append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {log_prefix} | Respuesta cruda: {content}")
    except Exception as e:
        append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {log_prefix} | Error llamando a OpenAI: {e}")
        return None, {"error": "Ocurrió un error al conectar con el modelo de lenguaje. Intenta nuevamente más tarde."}

    meta = {
        "raw_prompt": {
            "system": system_message,
            "user": user_message
        },
        "raw_response": content,
        "response_time_ms": elapsed_ms,
        "model": "gpt-4o"
    }

    usage = getattr(response, "usage", None)
    if usage:
        meta["tokens_prompt"] = getattr(usage, "prompt_tokens", None)
        meta["tokens_completion"] = getattr(usage, "completion_tokens", None)
        meta["tokens_total"] = getattr(usage, "total_tokens", None)

    meta["prompt_template_version"] = "v2.1-realdata"

    try:
        resp_json = json.loads(content)
        if "sql_query" in resp_json:
            sql_gen = resp_json["sql_query"].strip().lower()
            if any(word in sql_gen for word in ["delete", "drop", "alter", "truncate", "update", "insert", "create", "replace", "grant", "revoke", "exec", "commit", "rollback"]):
                append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {log_prefix} | Query bloqueada por seguridad: {resp_json['sql_query']}")
                return None, {"error": "Consulta no permitida por seguridad. (Intento de modificar datos)"}
            append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {log_prefix} | SQL generado: {resp_json['sql_query']}")
            return str(resp_json["sql_query"]), resp_json
        elif "info" in resp_json:
            append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {log_prefix} | Mensaje informativo del LLM: {resp_json['info']}")
            return None, resp_json
        elif "error" in resp_json:
            append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {log_prefix} | LLM error: {resp_json['error']}")
            return None, {"error": str(resp_json["error"])}
        else:
            append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {log_prefix} | Respuesta inesperada de LLM: {resp_json}")
            return None, {"error": "No se pudo interpretar la respuesta del modelo. Intenta reformular tu pregunta."}
    except Exception as e:
        append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {log_prefix} | Error parseando respuesta LLM: {e} - Content: {content}")
        return None, {"error": "La respuesta del modelo no es válida. Intenta nuevamente."}


def call_openai_explain_answer(
    question: str,
    sql: str,
    columns: List[str],
    rows: List[List[Any]],
    user_email: Optional[str] = None,
    return_metadata: bool = False
) -> Tuple[str, Dict[str, Any]]:
    """
    Explica un resultado tabular para usuarios de negocio, NO técnicos.
    """
    if not user_email:
        user_email = "usuario"

    example_rows = "\n".join(
        [str(dict(zip(columns, row))) for row in rows[:3]]
    )

    system_message = f"""
Eres un asistente especializado en explicar resultados SQL de bases de datos para usuarios NO TÉCNICOS.
Te entrego la consulta en lenguaje natural, el SQL generado y algunos ejemplos de los resultados obtenidos.

Debes entregar una explicación AMIGABLE Y RESUMIDA para un usuario de negocio. **No afirmes la cantidad de valores únicos a menos que el usuario explícitamente pregunte por el número; simplemente menciona que hay varias opciones y muestra algunos ejemplos.**
No incluyas lenguaje técnico ni SQL en la respuesta.

Pregunta: {question}
SQL: {sql}
Columnas: {columns}
Ejemplos de filas: {example_rows}

Responde SOLO con la explicación clara y en español.
"""
    meta = {}
    try:
        import time
        t0 = time.time()
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "system", "content": system_message}],
            max_tokens=256,
            temperature=0.2,
        )
        t1 = time.time()
        elapsed_ms = int((t1 - t0) * 1000)
        explanation = response.choices[0].message.content.strip()
        append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [USER: {user_email}] [EXPLAIN] Explicación generada: {explanation}")

        usage = getattr(response, "usage", None)
        meta = {
            "raw_prompt": {"system": system_message},
            "raw_response": explanation,
            "response_time_ms": elapsed_ms,
            "model": "gpt-4o",
            "prompt_template_version": "explain-v1"
        }
        if usage:
            meta["tokens_prompt"] = getattr(usage, "prompt_tokens", None)
            meta["tokens_completion"] = getattr(usage, "completion_tokens", None)
            meta["tokens_total"] = getattr(usage, "total_tokens", None)

        if return_metadata:
            return explanation, meta
        else:
            return explanation
    except Exception as e:
        append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] [USER: {user_email}] [EXPLAIN_ERROR] Error llamando a OpenAI para explicación: {e}")
        if return_metadata:
            return "Consulta realizada correctamente. Revisa los resultados.", {}
        else:
            return "Consulta realizada correctamente. Revisa los resultados."
