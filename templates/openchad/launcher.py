import subprocess
import sys
import os
import threading
from pathlib import Path

def check_for_updates(uv_path, python_dir, env):
    """
    Attempt: update by synching the venv.
    Gracefully fails if no internet or other issues occur.
    """
    print("Checking for updates...")
    try:
        subprocess.run(
            [uv_path, "sync", "--upgrade-package", "openchadpy"],
            cwd=python_dir,
            env=env,
            capture_output=True,
            timeout=15,
            check=False,
        )
        print("Update check complete.")
    except Exception as e:
        # Gracefully ignore any errors (offline, timeout, etc.)
        print(f"Skipping update: {e}")

def _tee(src, *dests):
    for line in src:
        for d in dests:
            d.write(line)
            d.flush()



def main():
    # Get the directory of the current executable
    if getattr(sys, 'frozen', False):
        base_path = os.path.dirname(sys.executable)
    else:
        base_path = os.path.dirname(os.path.abspath(__file__))

    log_path = Path(base_path) / "openchad.log"

    # Determine uv binary based on OS
    is_windows = os.name == "nt"
    uv_binary = "uv.exe" if is_windows else "uv"
    uv_path = os.path.join(base_path, "python", uv_binary)
    python_dir = os.path.join(base_path, "python")
    # Determine bundled python path
    if is_windows:
        python_runtime = os.path.join(base_path, "python", ".venv", "Scripts", "python.exe")
    else:
        python_runtime = os.path.join(base_path, "python", ".venv", "bin", "python3")
    # Verify python runtime exists
    if not os.path.exists(python_runtime):
        print(f"Error: Python runtime not found at {python_runtime}")
        sys.exit(1)
    # Set environment variables for uv to use bundled python
    env = os.environ.copy()
    env["UV_PYTHON"] = python_runtime
    env["UV_PYTHON_AUTO_INSTALL"] = "0"
    # Check for updates before running
    check_for_updates(uv_path, python_dir, env)
    # Command to run: uv run python/main.py
    cmd = [uv_path, "run", "python/main.py"]
    try:
        with open(log_path, "wb") as log_file:
            process = subprocess.Popen(
                cmd,
                cwd=base_path,
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NO_WINDOW if is_windows else 0,
            )

            t_out = threading.Thread(target=_tee, args=(process.stdout, sys.stdout.buffer, log_file))
            t_err = threading.Thread(target=_tee, args=(process.stderr, sys.stderr.buffer, log_file))
            t_out.start()
            t_err.start()

            process.wait()
            t_out.join()
            t_err.join()

        sys.exit(process.returncode)
    except Exception as e:
        print(f"Failed to start openchad: {e}")
        sys.exit(1)
if __name__ == "__main__":
    main()