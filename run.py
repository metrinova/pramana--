#!/usr/bin/env python3
"""Start PRAMĀṆA. Always run this file from the pramana folder (the one with run.py)."""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

try:
    from backend.app import app
except ModuleNotFoundError as e:
    missing = str(e)
    print("\nPRAMANA could not start:", missing)
    print("\nFix (in VS Code Terminal, from this folder):\n")
    print("    python -m venv .venv")
    if os.name == "nt":
        print("    .\\.venv\\Scripts\\activate")
    else:
        print("    source .venv/bin/activate")
    print("    pip install -r backend/requirements.txt")
    print("    python run.py\n")
    sys.exit(1)

if __name__ == "__main__":
    host = os.environ.get("PRAMANA_HOST", "0.0.0.0")
    port = int(os.environ.get("PRAMANA_PORT", "5000"))
    print("\n  PRAMANA is starting")
    print("  Open this in your browser:\n")
    print("      http://127.0.0.1:{}\n".format(port))
    print("  User:    trader@pramana.in  / trader123")
    print("  Officer: officer@pramana.in / officer123")
    print("  Stop with Ctrl+C\n")
    app.run(host=host, port=port, debug=os.environ.get("PRAMANA_DEBUG", "0") == "1")
