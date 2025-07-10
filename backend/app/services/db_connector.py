# app/services/db_connector.py

from typing import Dict, Tuple, List, Any
import psycopg2
import pyodbc

from app.utils.crypto import decrypt_password

def ensure_password_decrypted(connection: Dict[str, Any]) -> Dict[str, Any]:
    """
    Devuelve una copia del dict de conexión con la password desencriptada si corresponde.
    """
    password = connection.get("password", "")
    # Heurística simple: Fernet (gAAAA...) y suficientemente largo
    if isinstance(password, str) and password.startswith("gAAAA") and len(password) > 50:
        try:
            decrypted = decrypt_password(password)
        except Exception as e:
            print(f"[ERROR] No se pudo desencriptar la password: {e}")
            raise Exception("Password no válida o clave Fernet incorrecta")
        new_conn = connection.copy()
        new_conn["password"] = decrypted
        return new_conn
    return connection

def get_database_schema(connection: Dict[str, Any]) -> str:
    """
    Devuelve el esquema de la base de datos (tablas y columnas) como string, para prompting del LLM.
    """
    connection = ensure_password_decrypted(connection)
    db_type = connection.get("db_type")
    if db_type in ("postgres", "postgresql"):
        return get_postgres_schema(connection)
    elif db_type == "sqlserver":
        return get_sqlserver_schema(connection)
    else:
        return "Tipo de base de datos no soportado."

def get_postgres_schema(connection: Dict[str, Any]) -> str:
    try:
        conn = psycopg2.connect(
            host=connection["host"],
            port=connection.get("port", 5432),
            database=connection["database"],
            user=connection["username"],
            password=connection["password"]
        )
        cursor = conn.cursor()
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema='public'
            ORDER BY table_name;
        """)
        tables = cursor.fetchall()
        schema_info = []
        for (table_name,) in tables:
            cursor.execute("""
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = %s
                ORDER BY ordinal_position;
            """, (table_name,))
            columns = cursor.fetchall()
            schema_info.append(f"Tabla: {table_name}")
            for column_name, data_type in columns:
                schema_info.append(f"  - {column_name} ({data_type})")
        cursor.close()
        conn.close()
        return "\n".join(schema_info)
    except Exception as e:
        print(f"[DB][Postgres] Error extrayendo schema: {e}")
        return ""

def get_sqlserver_conn_str(connection: Dict[str, Any]) -> str:
    """
    Construye el string de conexión para SQL Server (ODBC).
    """
    host = connection["host"]
    port = str(connection.get("port", 1433))
    if "\\" in host:
        server = host  # Para instancias tipo host\SQLEXPRESS
    else:
        server = f"{host},{port}"
    return (
        f"DRIVER={{ODBC Driver 17 for SQL Server}};"
        f"SERVER={server};"
        f"DATABASE={connection['database']};"
        f"UID={connection['username']};"
        f"PWD={connection['password']};"
    )

def get_sqlserver_schema(connection: Dict[str, Any]) -> str:
    try:
        conn_str = get_sqlserver_conn_str(connection)
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE='BASE TABLE'
            ORDER BY TABLE_NAME;
        """)
        tables = cursor.fetchall()
        schema_info = []
        for (table_name,) in tables:
            cursor.execute("""
                SELECT COLUMN_NAME, DATA_TYPE
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE TABLE_NAME = ?
                ORDER BY ORDINAL_POSITION;
            """, (table_name,))
            columns = cursor.fetchall()
            schema_info.append(f"Tabla: {table_name}")
            for column_name, data_type in columns:
                schema_info.append(f"  - {column_name} ({data_type})")
        cursor.close()
        conn.close()
        return "\n".join(schema_info)
    except Exception as e:
        print(f"[DB][SQLServer] Error extrayendo schema: {e}")
        return ""

def execute_sql_query(connection: Dict[str, Any], sql_query: str) -> Tuple[List[str], List[List[Any]]]:
    """
    Ejecuta una consulta SQL y retorna ([column_names], [rows])
    """
    connection = ensure_password_decrypted(connection)
    db_type = connection.get("db_type")
    if db_type in ("postgres", "postgresql"):
        try:
            conn = psycopg2.connect(
                host=connection["host"],
                port=connection.get("port", 5432),
                database=connection["database"],
                user=connection["username"],
                password=connection["password"]
            )
            cursor = conn.cursor()
            cursor.execute(sql_query)
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            cursor.close()
            conn.close()
            return columns, [list(row) for row in rows]
        except Exception as e:
            print(f"[DB][Postgres] Error ejecutando SQL: {e}")
            raise
    elif db_type == "sqlserver":
        try:
            conn_str = get_sqlserver_conn_str(connection)
            conn = pyodbc.connect(conn_str)
            cursor = conn.cursor()
            cursor.execute(sql_query)
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            cursor.close()
            conn.close()
            return columns, [list(row) for row in rows]
        except Exception as e:
            print(f"[DB][SQLServer] Error ejecutando SQL: {e}")
            raise
    else:
        raise Exception("Tipo de base de datos no soportado para ejecución SQL.")

def get_table_names(connection: Dict[str, Any]) -> List[str]:
    """
    Devuelve la lista de tablas en la base de datos (solo tablas base, no vistas).
    """
    connection = ensure_password_decrypted(connection)
    db_type = connection.get("db_type")
    if db_type in ("postgres", "postgresql"):
        try:
            conn = psycopg2.connect(
                host=connection["host"],
                port=connection.get("port", 5432),
                database=connection["database"],
                user=connection["username"],
                password=connection["password"]
            )
            cursor = conn.cursor()
            cursor.execute("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema='public'
                ORDER BY table_name;
            """)
            tables = [row[0] for row in cursor.fetchall()]
            cursor.close()
            conn.close()
            return tables
        except Exception as e:
            print(f"[DB][Postgres] Error obteniendo tablas: {e}")
            return []
    elif db_type == "sqlserver":
        try:
            conn_str = get_sqlserver_conn_str(connection)
            conn = pyodbc.connect(conn_str)
            cursor = conn.cursor()
            cursor.execute("""
                SELECT TABLE_NAME
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_TYPE='BASE TABLE'
                ORDER BY TABLE_NAME;
            """)
            tables = [row[0] for row in cursor.fetchall()]
            cursor.close()
            conn.close()
            return tables
        except Exception as e:
            print(f"[DB][SQLServer] Error obteniendo tablas: {e}")
            return []
    else:
        return []
