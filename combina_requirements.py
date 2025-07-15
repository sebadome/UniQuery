import re
import glob
import subprocess

# 1. Mezcla todos los archivos de requirements existentes
input_files = glob.glob("requirements_*.txt") + ["requirements.txt"]
all_lines = []

for file in input_files:
    try:
        with open(file, "r", encoding="utf-8") as f:
            all_lines += [line.strip() for line in f if line.strip() and not line.strip().startswith("#")]
    except FileNotFoundError:
        continue

# 2. Añade el output de pip freeze
print("Agregando dependencias actuales del entorno (pip freeze)...")
freeze_output = subprocess.run("pip freeze", shell=True, capture_output=True, text=True)
freeze_lines = [line.strip() for line in freeze_output.stdout.splitlines() if line.strip()]
all_lines += freeze_lines

# 3. Limpia duplicados, dejando solo la versión más específica
re_versioned = re.compile(r"^([a-zA-Z0-9_\-]+)==(.+)$")
re_plain = re.compile(r"^([a-zA-Z0-9_\-]+)$")
deps = {}

for line in all_lines:
    m = re_versioned.match(line)
    if m:
        pkg = m.group(1).lower()
        deps[pkg] = line  # versión específica sobrescribe la genérica
        continue
    m = re_plain.match(line)
    if m:
        pkg = m.group(1).lower()
        # Solo agregar si no existe versión específica antes
        if pkg not in deps:
            deps[pkg] = line
        continue
    # Otros formatos, agrégalos igual (ej: >=, extras, etc)
    pkg = line.split("==")[0].lower()
    if pkg not in deps:
        deps[pkg] = line

# 4. Escribe el archivo combinado y limpio
output_file = "requirements_final_clean.txt"
with open(output_file, "w", encoding="utf-8") as f:
    for line in sorted(deps.values()):
        f.write(line + "\n")

print(f"\n¡Listo! Archivo limpio y combinado generado como: {output_file}")
