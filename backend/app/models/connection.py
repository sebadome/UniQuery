# app/models/connection.py

from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.db import Base

class Connection(Base):
    __tablename__ = "connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Relación a tabla auth.users de Supabase (ajusta ForeignKey si tienes esquema "public")
    user_id = Column(UUID(as_uuid=True), ForeignKey("auth.users.id"), nullable=False)
    name = Column(String, nullable=False)
    db_type = Column(String, nullable=False)  # Usa db_type, nunca 'type'
    host = Column(String, nullable=False)
    port = Column(Integer, nullable=False)
    database = Column(String, nullable=False)
    username = Column(String, nullable=False)
    password = Column(String, nullable=False)  # MVP: encripta en producción real
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Si necesitas agregar dictionary_table/data_dictionary en modelo físico (opcional):
    # dictionary_table = Column(String, nullable=True)
    # data_dictionary = Column(JSONB, nullable=True)

    # def __repr__(self):
    #     return f"<Connection(id={self.id}, user_id={self.user_id}, ...)>"
