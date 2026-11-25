import os
import sys

# Ensure backend modules (main, database, schemas) are importable on Vercel
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from main import app  # noqa: E402, F401
