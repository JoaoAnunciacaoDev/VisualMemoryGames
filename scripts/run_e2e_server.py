import os
import sys
from pathlib import Path

import uvicorn

project_root = Path(__file__).resolve().parent.parent
os.chdir(project_root)
sys.path.insert(0, str(project_root))

# Configura as variáveis de ambiente necessárias para o servidor de testes E2E
os.environ["ENVIRONMENT"] = "testing"
os.environ["DATABASE_URL"] = "sqlite:///./visualmemory_test.db"
os.environ["SECRET_KEY"] = "test-secret-key-for-e2e-tests-at-least-32-bytes"

# Força codificação UTF-8 para evitar falhas com emojis/Unicode no Windows
os.environ["PYTHONIOENCODING"] = "utf-8"
os.environ["PYTHONUTF8"] = "1"

try:
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, app_dir=str(project_root))
except KeyboardInterrupt:
    sys.exit(0)
except Exception as e:
    print(f"Erro ao iniciar o servidor E2E: {e}")
    sys.exit(1)
