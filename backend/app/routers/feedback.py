# app/routers/feedback.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import update, select
from sqlalchemy.exc import SQLAlchemyError
from app.deps.auth import get_current_user
from app.services.query_logger import engine, query_logs
from app.schemas.query_log import QueryLogFeedback

router = APIRouter(
    prefix="/feedback",
    tags=["feedback"]
)

@router.post("/{log_id}", response_model=dict)
async def submit_feedback(
    log_id: int,
    feedback: QueryLogFeedback,
    user=Depends(get_current_user)
):
    """
    Permite a un usuario registrar feedback (👍👎 + comentario) sobre una consulta realizada.
    """
    user_id = str(user["user_id"])  # <-- Convierte a str para evitar comparaciones ambiguas

    try:
        with engine.begin() as conn:
            # 1. Verifica que el log existe y pertenece al usuario
            result = conn.execute(
                select(query_logs.c.user_id).where(query_logs.c.id == log_id)
            ).first()
            if not result:
                raise HTTPException(status_code=404, detail="Log no encontrado.")
            log_user_id = str(result[0])
            if log_user_id != user_id:
                raise HTTPException(status_code=403, detail="No puedes modificar feedback de otro usuario.")

            # 2. Actualiza feedback y comentario. Si tienes trigger para updated_at, puedes dejarlo como None.
            upd = (
                update(query_logs)
                .where(query_logs.c.id == log_id)
                .values(
                    feedback=feedback.feedback,
                    feedback_comment=feedback.feedback_comment,
                    updated_at=None  # Deja que el trigger de DB actualice updated_at
                )
            )
            conn.execute(upd)

    except SQLAlchemyError as e:
        raise HTTPException(status_code=500, detail=f"Error al guardar feedback: {str(e)}")
    except Exception as e:
        # Captura otros errores no previstos
        raise HTTPException(status_code=500, detail=f"Error inesperado: {str(e)}")

    return {"success": True, "log_id": log_id}
