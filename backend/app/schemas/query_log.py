# app/schemas/query_log.py

from typing import Optional, List, Any, Dict
from pydantic import BaseModel
from datetime import datetime

class QueryLogCreate(BaseModel):
    user_id: str
    user_email: str
    question: str
    table_used: Optional[str] = None
    sql_generated: Optional[str] = None
    sql_exec_success: Optional[bool] = False
    error_message: Optional[str] = None
    llm_model: Optional[str] = None
    llm_tokens_prompt: Optional[int] = None
    llm_tokens_completion: Optional[int] = None
    llm_tokens_total: Optional[int] = None
    llm_response_time_ms: Optional[float] = None
    sql_exec_time_ms: Optional[float] = None
    row_count: Optional[int] = None
    columns: Optional[List[str]] = None
    feedback: Optional[int] = None
    feedback_comment: Optional[str] = None
    llm_raw_request: Optional[Dict[str, Any]] = None
    llm_raw_response: Optional[Dict[str, Any]] = None
    frontend_version: Optional[str] = None
    api_version: Optional[str] = None
    client_ip: Optional[str] = None
    user_agent: Optional[str] = None
    prompt_template_version: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class QueryLogFeedback(BaseModel):
    feedback: int    # 1: 👍, -1: 👎
    feedback_comment: Optional[str] = None
