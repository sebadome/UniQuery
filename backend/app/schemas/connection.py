# app/schemas/connection.py

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime

class ConnectionBase(BaseModel):
    """
    Base de una conexión a base de datos.
    """
    name: str
    db_type: str   # Ej: "sqlserver", "postgresql", etc.
    host: str
    port: int
    database: str
    username: str
    password: str  # Solo usar para input. Nunca retornar este campo en Output.
    dictionary_table: Optional[str] = None  # Tabla asociada al diccionario
    data_dictionary: Optional[Dict[str, Any]] = None  # Diccionario de datos (JSON)

class ConnectionCreate(ConnectionBase):
    """
    Esquema para crear una conexión.
    """
    pass

class ConnectionOut(BaseModel):
    """
    Esquema de retorno de conexión (sin password).
    """
    id: UUID
    user_id: UUID
    name: str
    db_type: str
    host: str
    port: int
    database: str
    username: str
    dictionary_table: Optional[str] = None
    data_dictionary: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    isActive: Optional[bool] = None

    class Config:
        orm_mode = True
        json_encoders = {
            UUID: lambda v: str(v),
            datetime: lambda v: v.isoformat(),
        }
