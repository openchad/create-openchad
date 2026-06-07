import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

# Define project root (relative to this script)
# Script is in <root>/python/main.py
_PYTHON_DIR = os.path.dirname(os.path.abspath(__file__))
_PROJECT_ROOT = os.path.dirname(_PYTHON_DIR)

# Define Resource Directories
BACKEND_DIR = os.path.join(_PROJECT_ROOT, "Backend")
PIPELINE_DIR = os.path.join(_PROJECT_ROOT, "Pipeline")
TOOLS_DIR = os.path.join(_PROJECT_ROOT, "Tools")
TASK_TRIGGER_DIR = os.path.join(_PROJECT_ROOT, "TaskTrigger")
CONFIG_JSON = os.path.join(_PYTHON_DIR, "config.json")

# Set Environment Variables for OpenChad
os.environ["OPENCHAD_PROJECT_DIR"] = _PROJECT_ROOT
os.environ["OPENCHAD_PYTHON_DIR"] = _PYTHON_DIR
os.environ["OPENCHAD_UV_PROJECT_DIR"] = _PYTHON_DIR
os.environ["OPENCHAD_BACKENDS_DIR"] = BACKEND_DIR
os.environ["OPENCHAD_PIPELINES_DIR"] = PIPELINE_DIR
os.environ["OPENCHAD_TOOLS_DIR"] = TOOLS_DIR
os.environ["OPENCHAD_MODEL_PROVIDERS_DIR"] = os.path.join(_PROJECT_ROOT, "ModelProvider")
os.environ["OPENCHAD_SETTINGS_DIR"] = os.path.join(_PROJECT_ROOT, "Settings")
os.environ["OPENCHAD_CONFIG_PATH"] = CONFIG_JSON
os.environ["_PYTAURI_DIST"] = "pytauri-wheel"

from openchadpy.main import main
if __name__ == "__main__":
    # Start the integrated application (FastAPI + Tauri)
    sys.exit(main())