import os
import openai
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List, Tuple

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
    return datetime.now().strftime("%d/%m/%Y")

# --- Detectores de intención ---
def is_count_columns_question(question: str) -> Optional[str]:
    import re
    patrones = [
        r"(?:cu[aá]ntas?|n[uú]mero de) columnas (?:tiene|hay en) (?:la tabla )?'?(\w+)'?",
        r"columnas de (?:la tabla )?'?(\w+)'?"
    ]
    for pat in patrones:
        match = re.search(pat, question, re.IGNORECASE)
        if match:
            nombre = match.group(1).lower()
            if nombre not in ["la", "tabla", "columna", "columnas"]:
                return nombre
    return None

def is_list_columns_question(question: str) -> Optional[str]:
    # Detecta intenciones de LISTAR/DETALLAR/NOMBRAR columnas
    import re
    patrones = [
        r"(?:cu[aá]les|n[oó]mbra|lista|detalla|dime|m[uú]estr[aá]|cu[aá]les son las) columnas(?: de la tabla)? ?'?(.*?)'?$",
        r"lista(?:do)? de columnas(?: de la tabla)? ?'?(.*?)'?$",
        r"necesito el detalle de las columnas(?: de la tabla)? ?'?(.*?)'?$",
        r"nombre[s]? de las columnas(?: de la tabla)? ?'?(.*?)'?$",
        r"(?:qué columnas|columns) tiene(?: la tabla)? ?'?(.*?)'?$"
    ]
    for pat in patrones:
        match = re.search(pat, question, re.IGNORECASE)
        if match:
            nombre = match.group(1).strip().lower()
            if nombre not in ["", "la", "tabla", "columna", "columnas"]:
                return nombre
    # Si pregunta directo "me puedes listar las columnas" sin tabla y hay tabla activa, return None
    if any(word in question.lower() for word in ["list", "detalle", "nombre", "cuáles", "dime", "muéstrame", "detalla"]) and "column" in question.lower():
        return ""
    return None

def is_count_rows_question(question: str) -> Optional[str]:
    import re
    patrones = [
        r"(?:cu[aá]ntos?|n[uú]mero de) (?:registros|filas) (?:tiene|hay en) (?:la tabla )?'?(\w+)'?",
        r"(?:registros|filas) de (?:la tabla )?'?(\w+)'?"
    ]
    for pat in patrones:
        match = re.search(pat, question, re.IGNORECASE)
        if match:
            nombre = match.group(1).lower()
            if nombre not in ["la", "tabla", "columna", "columnas"]:
                return nombre
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

    selected_table = dictionary_table or None

    # --- Detección explícita de preguntas sobre columnas ---
    table_for_list_columns = is_list_columns_question(question)
    if table_for_list_columns is not None:
        table_to_query = table_for_list_columns if table_for_list_columns else selected_table
        if not table_to_query:
            # Si no se puede inferir tabla, sigue al LLM normal
            pass
        else:
            if db_type.lower() in ("postgres", "postgresql"):
                sql_query = f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_to_query}';"
            elif db_type.lower() == "sqlserver":
                sql_query = f"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '{table_to_query}';"
            else:
                sql_query = f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table_to_query}';"
            meta = {
                "sql_query": sql_query,
                "force_list_columns_message": True,
                "table_name": table_to_query,
                "raw_prompt": "NO LLM - Respuesta generada por backend para listado de columnas",
                "raw_response": None,
                "response_time_ms": 0,
                "model": "backend-direct",
                "tokens_prompt": None,
                "tokens_completion": None,
                "tokens_total": None,
                "prompt_template_version": "backend-direct"
            }
            return sql_query, meta

    table_for_count = is_count_columns_question(question)
    table_for_count_rows = is_count_rows_question(question)
    if (not table_for_count and "column" in question.lower() and selected_table) or \
       (table_for_count == "la" and selected_table):
        table_for_count = selected_table
    if (not table_for_count_rows and "registro" in question.lower() and selected_table) or \
       (table_for_count_rows == "la" and selected_table):
        table_for_count_rows = selected_table

    if table_for_count:
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
            "raw_prompt": "NO LLM - Respuesta generada por backend para conteo de columnas",
            "raw_response": None,
            "response_time_ms": 0,
            "model": "backend-direct",
            "tokens_prompt": None,
            "tokens_completion": None,
            "tokens_total": None,
            "prompt_template_version": "backend-direct"
        }
        return sql_query, meta

    if table_for_count_rows:
        if db_type.lower() in ("postgres", "postgresql"):
            sql_query = (
                f"SELECT COUNT(*) FROM {table_for_count_rows};"
            )
        elif db_type.lower() == "sqlserver":
            sql_query = (
                f"SELECT COUNT(*) FROM {table_for_count_rows};"
            )
        else:
            sql_query = (
                f"SELECT COUNT(*) FROM {table_for_count_rows};"
            )
        meta = {
            "sql_query": sql_query,
            "force_count_rows_message": True,
            "table_name": table_for_count_rows,
            "raw_prompt": "NO LLM - Respuesta generada por backend para conteo de registros",
            "raw_response": None,
            "response_time_ms": 0,
            "model": "backend-direct",
            "tokens_prompt": None,
            "tokens_completion": None,
            "tokens_total": None,
            "prompt_template_version": "backend-direct"
        }
        return sql_query, meta

    # ---------- PROMPT LLM para el resto de casos -----------
    context_info = ""
    if dictionary_table:
        context_info = (
            f"\n- Si el usuario te saluda o pregunta '¿quién eres?', responde: "
            f'"¡Hola! Soy un asistente que te ayudará a responder preguntas sobre la tabla **{dictionary_table}** que tienes seleccionada. '
            "Puedes consultarme por columnas, tipos de datos, resúmenes, valores, conteos y todo lo que necesites saber de esa tabla. '"
            "\n- Si el usuario hace una pregunta sobre columnas, registros, estructura o datos sin especificar una tabla, responde SIEMPRE usando la tabla seleccionada '{dictionary_table}' y deja esto explícito en la respuesta."
        )
    else:
        context_info = (
            "\n- Si el usuario te saluda o pregunta '¿quién eres?', responde: "
            '"¡Hola! Soy un asistente que te ayudará a responder preguntas sobre la base de datos que estás trabajando. '
            "Dime sobre qué tabla te gustaría preguntar, y te ayudo con gusto.'"
        )

    system_message = f"""
Eres un asistente experto en transformar preguntas en lenguaje natural a consultas SQL SEGURAS y en sugerir la mejor visualización posible según los resultados.

Siempre debes responder SOLO con un JSON estructurado, nunca con texto fuera del JSON.
Estructura estándar de tu respuesta (incluir solo lo que aplica):

{{
  "sql_query": "Consulta SQL generada",
  "table": [["Col1", "Col2"], ["valor1", "valor2"], ...],
  "list": ["valor1", "valor2", ...],
  "chart": {{
    "type": "bar|pie|line|doughnut|scatter",
    "labels": ["etiqueta1", "etiqueta2", ...],
    "values": [10, 20, ...]
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
- Si la pregunta es solo un saludo, responde SOLO con este JSON (sin ningún otro campo):

{{
  "info": "¡Hola! Soy tu asistente. Te ayudo a responder preguntas sobre la tabla '{dictionary_table}' que tienes seleccionada. Pregúntame sobre columnas, datos o resúmenes para empezar."
}}

{context_info}

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

    meta["prompt_template_version"] = "v2.4-columns-detect"

    try:
        resp_json = json.loads(content)
        if "sql_query" in resp_json:
            sql_gen = resp_json["sql_query"].strip().lower()
            if any(word in sql_gen for word in ["delete", "drop", "alter", "truncate", "update", "insert", "create", "replace", "grant", "revoke", "exec", "commit", "rollback"]):
                append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {log_prefix} | Query bloqueada por seguridad: {resp_json['sql_query']}")
                return None, {"error": "Consulta no permitida por seguridad. (Intento de modificar datos)"}
            append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {log_prefix} | SQL generado: {resp_json['sql_query']}")
            meta.update(resp_json)
            return str(resp_json["sql_query"]), meta
        elif "info" in resp_json:
            append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {log_prefix} | Mensaje informativo del LLM: {resp_json['info']}")
            meta.update(resp_json)
            return None, meta
        elif "error" in resp_json:
            append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {log_prefix} | LLM error: {resp_json['error']}")
            meta.update(resp_json)
            return None, meta
        else:
            append_log_file(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {log_prefix} | Respuesta inesperada de LLM: {resp_json}")
            meta.update({"error": "No se pudo interpretar la respuesta del modelo. Intenta reformular tu pregunta."})
            return None, meta
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
