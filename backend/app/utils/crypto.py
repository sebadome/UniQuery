import os
from cryptography.fernet import Fernet

# Obtiene la clave desde la variable de entorno FERNET_KEY
FERNET_KEY = os.getenv("FERNET_KEY")
if not FERNET_KEY:
    raise RuntimeError("FERNET_KEY no está definida en el entorno")

# Si por alguna razón la clave viene como bytes, la usamos directo. Normalmente es str.
if isinstance(FERNET_KEY, str):
    _fernet = Fernet(FERNET_KEY.encode())
else:
    _fernet = Fernet(FERNET_KEY)

def encrypt_password(password: str) -> str:
    """
    Cifra el password en texto plano y lo devuelve como string base64 seguro.
    """
    return _fernet.encrypt(password.encode()).decode()

def decrypt_password(enc_password: str) -> str:
    """
    Descifra un password almacenado encriptado.
    """
    return _fernet.decrypt(enc_password.encode()).decode()
