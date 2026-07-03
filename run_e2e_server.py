import os
import subprocess
import sys

# Configura as variáveis de ambiente necessárias para o servidor de testes E2E
os.environ["ENVIRONMENT"] = "testing"
os.environ["DATABASE_URL"] = "sqlite:///./visualmemory_test.db"

# Força codificação UTF-8 para evitar falhas com emojis/Unicode no Windows
os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["PYTHONUTF8"] = "1"

try:
    # Executa o fastapi dev usando poetry
    subprocess.run(["poetry", "run", "fastapi", "dev", "app/main.py"], check=True)
except KeyboardInterrupt:
    sys.exit(0)
except Exception as e:
    print(f"Erro ao iniciar o servidor E2E: {e}")
    sys.exit(1)
