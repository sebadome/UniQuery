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
    Envía una pregunta al modelo LLM para generar una consulta SQL segura.
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

    # PROMPT LLM
    system_message = f"""
Eres un asistente experto en transformar preguntas en lenguaje natural a consultas SQL SEGURAS.
Utiliza el siguiente esquema de base de datos:{dict_msg}

<schema>
{schema}
</schema>

Reglas de seguridad:
- No generes NUNCA sentencias que alteren datos o la estructura: DELETE, DROP, ALTER, TRUNCATE, UPDATE, INSERT, CREATE, REPLACE, GRANT, REVOKE, EXEC, COMMIT, ROLLBACK.
- Si la pregunta requiere información sobre la estructura de la tabla (como cantidad o nombres de columnas/tablas), puedes usar tablas del sistema como information_schema.columns, information_schema.tables, sys.tables, pg_catalog.pg_tables, etc.
- Si el usuario **no menciona una tabla**, asume que debe usarse la tabla seleccionada: '{dictionary_table}'.
- Si la pregunta es un saludo, una presentación, o no es relevante para SQL (ej: "hola", "quién eres", "cómo estás", "preséntate"), responde SOLO con este JSON:
  {{"info": "¡Hola! Soy tu asistente inteligente UniQuery. Puedo responder consultas sobre tus datos. Por ejemplo: '¿Cuántos registros hay en la tabla ventas?' o 'Muestra las ventas del mes pasado'. ¡Hazme una pregunta sobre tu base de datos cuando quieras!"}}
- Para todo lo demás, intenta generar la mejor consulta posible.
- La respuesta debe ser SOLO el JSON: {{"sql_query": "SELECT ..."}}
- Usa nombres de tablas y campos EXACTAMENTE como aparecen en el esquema.
Hoy es {get_current_date()}.
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
            max_tokens=512,
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

    meta["prompt_template_version"] = "v1.0"

    try:
        resp_json = json.loads(content)
        if "sql_query" in resp_json:
            sql_gen = resp_json["sql_query"].strip().lower()
            if any(word in sql_gen for word in ["delete", "drop", "alter", "truncate", "update", "insert", "create", "replace", "grant", "revoke", "exec", "commit", "rollback"]):
                append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {log_prefix} | Query bloqueada por seguridad: {resp_json['sql_query']}")
                return None, {"error": "Consulta no permitida por seguridad. (Intento de modificar datos)"}
            append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {log_prefix} | SQL generado: {resp_json['sql_query']}")
            return str(resp_json["sql_query"]), meta
        elif "info" in resp_json:
            append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {log_prefix} | Mensaje informativo del LLM: {resp_json['info']}")
            meta["info_message"] = resp_json["info"]
            return None, meta
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
