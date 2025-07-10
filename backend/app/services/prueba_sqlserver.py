import pyodbc

conn_str = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=localhost\\SQLEXPRESS;"
    "DATABASE=GESTION00;"       # <-- cambia aquí a la base que quieres probar
    "UID=test_user;"
    "PWD=Valeria5036.jaj;"          # <-- reemplaza por la contraseña real de test_user
)

try:
    conn = pyodbc.connect(conn_str)
    print("¡Conexión exitosa!")
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sys.tables")
    tablas = cursor.fetchall()
    print("Tablas encontradas:")
    for t in tablas:
        print("-", t[0])
    conn.close()
except Exception as e:
    print("ERROR:", e)
