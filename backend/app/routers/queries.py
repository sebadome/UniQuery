# app/routers/queries.py

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import List, Any, Optional, Dict
from datetime import datetime

from app.deps.auth import get_current_user
from app.services.supabase_service import get_active_connection_for_user
from app.services.db_connector import get_database_schema, execute_sql_query
from app.services.llm_query import (
    call_openai_generate_sql,
    call_openai_explain_answer
)
from app.services.query_logger import log_query_attempt

router = APIRouter(
    prefix="/human_query",
    tags=["human_query"]
)

class HumanQueryResponse(BaseModel):
    answer: str
    sql_query: Optional[str] = None
    columns: Optional[List[str]] = None
    rows: Optional[List[List[Any]]] = None
    executionTime: Optional[float] = None
    query_log_id: Optional[int] = None
    chart: Optional[Dict[str, Any]] = None
    list: Optional[List[Any]] = None
    table: Optional[List[List[Any]]] = None

class HumanQueryRequest(BaseModel):
    question: str
    table: Optional[str] = None
    connection_id: Optional[str] = None

@router.post("/", response_model=HumanQueryResponse)
async def human_query(
    request: HumanQueryRequest,
    fastapi_request: Request,
    user=Depends(get_current_user)
):
    user_email = user.get("email") or str(user.get("user_id"))
    user_id = user["user_id"]
    user_token = user["jwt"]

    client_ip = fastapi_request.client.host if fastapi_request.client else None
    user_agent = fastapi_request.headers.get("user-agent", "")

    query_log_data = {
        "user_id": user_id,
        "user_email": user_email,
        "question": request.question,
        "table_used": request.table,
        "llm_model": "gpt-4o",
        "llm_tokens_prompt": None,
        "llm_tokens_completion": None,
        "llm_tokens_total": None,
        "llm_response_time_ms": None,
        "sql_exec_time_ms": None,
        "sql_generated": None,
        "sql_exec_success": False,
        "error_message": None,
        "row_count": None,
        "columns": None,
        "llm_raw_request": None,
        "llm_raw_response": None,
        "frontend_version": fastapi_request.headers.get("x-frontend-version"),
        "api_version": "v1",
        "client_ip": client_ip,
        "user_agent": user_agent,
        "prompt_template_version": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "feedback": None,
        "feedback_comment": None,
        "llm_final_answer": None,
        "sql_raw_result": None
    }
    query_log_id = None

    try:
        # 1. Recupera la conexión activa
        connection = get_active_connection_for_user(user_id, user_token)
        if not connection:
            query_log_data["error_message"] = "No hay conexión activa para el usuario."
            query_log_id = log_query_attempt(query_log_data)
            raise HTTPException(
                status_code=400,
                detail="No hay conexión activa para el usuario. Por favor conecta tu base de datos primero."
            )

        # 2. Extrae el esquema de la base de datos activa
        schema = get_database_schema(connection)
        if not schema or schema.strip() == "":
            query_log_data["error_message"] = "Esquema vacío"
            query_log_id = log_query_attempt(query_log_data)
            raise HTTPException(
                status_code=400,
                detail="No se pudo extraer el esquema de la base de datos activa. Verifica que la conexión esté correctamente configurada."
            )

        # 3. Llama al LLM para obtener el SQL y metadatos enriquecidos
        sql_result, llm_json = call_openai_generate_sql(
            question=request.question,
            schema=schema,
            data_dictionary=connection.get("data_dictionary"),
            db_type=connection.get("db_type", ""),
            dictionary_table=request.table or connection.get("dictionary_table"),
            user_email=user_email,
            return_metadata=True
        )

        # (1) Si es saludo/presentación
        if llm_json and "info" in llm_json:
            info_message = llm_json["info"]
            query_log_data["llm_final_answer"] = info_message
            query_log_data["llm_raw_request"] = llm_json.get("raw_prompt")
            query_log_data["llm_raw_response"] = llm_json.get("raw_response")
            query_log_data["prompt_template_version"] = llm_json.get("prompt_template_version")
            query_log_id = log_query_attempt(query_log_data)
            return HumanQueryResponse(
                answer=info_message,
                sql_query=None,
                columns=None,
                rows=None,
                executionTime=None,
                query_log_id=query_log_id,
                chart=None,
                list=None,
                table=None,
            )

        # (2) Si LLM no generó SQL
        if sql_result is None:
            # Si viene un dict con "error", lo tomamos
            if isinstance(llm_json, dict) and "error" in llm_json:
                error_msg = llm_json["error"]
            else:
                error_msg = "No se pudo generar consulta SQL (LLM falló)."
            query_log_data["error_message"] = error_msg
            query_log_data["llm_raw_request"] = llm_json.get("raw_prompt") if isinstance(llm_json, dict) else None
            query_log_data["llm_raw_response"] = llm_json.get("raw_response") if isinstance(llm_json, dict) else None
            query_log_data["prompt_template_version"] = llm_json.get("prompt_template_version") if isinstance(llm_json, dict) else None
            query_log_id = log_query_attempt(query_log_data)
            raise HTTPException(
                status_code=400,
                detail=error_msg
            )

        if isinstance(sql_result, dict) and "error" in sql_result:
            query_log_data["error_message"] = sql_result["error"]
            query_log_id = log_query_attempt(query_log_data)
            raise HTTPException(
                status_code=400,
                detail=sql_result["error"]
            )

        sql_query = sql_result if isinstance(sql_result, str) else None
        if not sql_query:
            query_log_data["error_message"] = "No se pudo generar consulta SQL válida."
            query_log_id = log_query_attempt(query_log_data)
            raise HTTPException(
                status_code=400,
                detail="No se pudo generar consulta SQL válida. Reformula tu pregunta."
            )

        # (3) Guarda metadata LLM y SQL generado
        query_log_data["sql_generated"] = sql_query
        query_log_data["llm_raw_request"] = llm_json.get("raw_prompt")
        query_log_data["llm_raw_response"] = llm_json.get("raw_response")
        query_log_data["llm_tokens_prompt"] = llm_json.get("tokens_prompt")
        query_log_data["llm_tokens_completion"] = llm_json.get("tokens_completion")
        query_log_data["llm_tokens_total"] = llm_json.get("tokens_total")
        query_log_data["llm_response_time_ms"] = llm_json.get("response_time_ms")
        query_log_data["prompt_template_version"] = llm_json.get("prompt_template_version")

        # 4. Ejecuta el SQL y guarda resultados y métricas
        import time
        t0 = time.time()
        columns, rows = execute_sql_query(connection, sql_query)
        exec_time = (time.time() - t0) * 1000  # ms
        query_log_data["sql_exec_time_ms"] = exec_time
        query_log_data["sql_exec_success"] = True
        query_log_data["columns"] = columns
        query_log_data["row_count"] = len(rows)
        query_log_data["sql_raw_result"] = rows

    except HTTPException as http_exc:
        query_log_id = log_query_attempt(query_log_data)
        raise http_exc

    except Exception as e:
        query_log_data["error_message"] = str(e)
        query_log_id = log_query_attempt(query_log_data)
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar la consulta: {str(e)}"
        )

    # 5. Genera respuesta amigable usando el LLM (solo muestra máximo 20 filas)
    try:
        preview_rows = rows[:20]
        answer_text, llm_explain_meta = call_openai_explain_answer(
            question=request.question,
            sql=sql_query,
            columns=columns,
            rows=preview_rows,
            user_email=user_email,
            return_metadata=True
        )
        if not answer_text or len(answer_text) < 5:
            answer_text = f"Consulta ejecutada correctamente. Registros: {len(rows)}."
        query_log_data["llm_final_answer"] = answer_text
    except Exception as e:
        answer_text = f"Consulta ejecutada correctamente. Registros: {len(rows)}."
        query_log_data["llm_final_answer"] = answer_text

    query_log_id = log_query_attempt(query_log_data)

    # 6. Prepara la respuesta enriquecida con todo lo relevante
    chart = llm_json.get("chart") if isinstance(llm_json, dict) else None
    lista = llm_json.get("list") if isinstance(llm_json, dict) else None
    tabla = llm_json.get("table") if isinstance(llm_json, dict) else None

    return HumanQueryResponse(
        answer=llm_json.get("message", answer_text) if isinstance(llm_json, dict) and llm_json.get("message") else answer_text,
        sql_query=sql_query,
        columns=columns,
        rows=rows,
        executionTime=exec_time,
        query_log_id=query_log_id,
        chart=chart,
        list=lista,
        table=tabla,
    )
