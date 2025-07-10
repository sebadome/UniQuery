# app/deps/auth.py

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

bearer_scheme = HTTPBearer(auto_error=True)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> dict:
    """
    Valida el JWT del header Authorization y retorna el user_id + token original.
    - EN PRODUCCIÓN: Debes validar la firma con la clave pública de Supabase.
    """
    token = credentials.credentials

    try:
        # SOLO para desarrollo/MVP: NO se valida la firma (¡NO SEGURO para producción!)
        payload = jwt.decode(token, options={"verify_signature": False})

        user_id = payload.get("sub")
        email = payload.get("email")
        exp = payload.get("exp")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token sin user_id (sub)"
            )

        # (Opcional) Validar expiración del token
        # from datetime import datetime
        # if exp and datetime.utcnow().timestamp() > exp:
        #     raise HTTPException(
        #         status_code=status.HTTP_401_UNAUTHORIZED,
        #         detail="Token expirado"
        #     )

        return {
            "user_id": user_id,
            "email": email,
            "jwt": token,
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expirado"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido: {e}"
        )
