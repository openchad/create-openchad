import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Paths
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// scripts/build.mjs lives one level below the project root
const PROJECT_ROOT = path.resolve(__dirname, "..");
const RELEASE_DIR  = path.join(PROJECT_ROOT, "Release");

// Helpers
function log(msg)  { console.log(`\x1b[36m[build]\x1b[0m ${msg}`); }
function ok(msg)   { console.log(`\x1b[32m[build]\x1b[0m ${msg}`); }
function warn(msg) { console.warn(`\x1b[33m[build]\x1b[0m ${msg}`); }
function die(msg)  { console.error(`\x1b[31m[build]\x1b[0m ${msg}`); process.exit(1); }

/** Recursively copy src → dest, mirroring the directory tree. */
function copyDirSync(src, dest) {
  if (!fs.existsSync(src)) {
    warn(`Source not found, skipping: ${src}`);
    return;
  }

  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src,  entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 1. Read package.json
const pkgPath = path.join(PROJECT_ROOT, "package.json");
if (!fs.existsSync(pkgPath)) die(`package.json not found at: ${pkgPath}`);

const pkg  = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
const name = pkg.name?.trim();
if (!name) die("package.json is missing a 'name' field.");

log(`Project name: ${name}`);

// 2. Ensure Release/ exists
log(`Creating Release directory: ${RELEASE_DIR}`);
fs.mkdirSync(RELEASE_DIR, { recursive: true });

// 3. Resolve uv / uvx executable
/**
 * Resolution order:
 *   1. `uvx` on PATH  (standard install)
 *   2. `uv`  on PATH  (run as: uv tool run pyinstaller …)
 *   3. Standalone `uv` / `uvx` inside project/python/
 *      Tries: uv.exe, uv, uvx.exe, uvx  (Windows-first, then POSIX)
 */
function resolveUvx() {
  // Helper: return true if the command is found on PATH
  function onPath(bin) {
    try {
      const flag = process.platform === "win32" ? `where ${bin}` : `which ${bin}`;
      execSync(flag, { stdio: "pipe" });
      return true;
    } catch {
      return false;
    }
  }

  // 1. prefer `uvx` directly on PATH
  if (onPath("uvx")) {
    log("uv: using system uvx from PATH.");
    return { bin: "uvx", args: ["pyinstaller"] };
  }

  // 2. fall back to `uv tool run` on PATH
  if (onPath("uv")) {
    log("uv: using system uv (tool run) from PATH.");
    return { bin: "uv", args: ["tool", "run", "pyinstaller"] };
  }

  // 3. look for a standalone uv / uvx inside project/python/
  const pythonDir = path.join(PROJECT_ROOT, "python");
  const candidates = process.platform === "win32"
    ? ["uvx.exe", "uvx", "uv.exe", "uv"]
    : ["uvx", "uv"];

  for (const candidate of candidates) {
    const full = path.join(pythonDir, candidate);
    if (fs.existsSync(full)) {
      const isUvx = candidate.startsWith("uvx");
      log(`uv: using standalone ${candidate} from project/python/`);
      return isUvx
        ? { bin: `"${full}"`, args: ["pyinstaller"] }
        : { bin: `"${full}"`, args: ["tool", "run", "pyinstaller"] };
    }
  }

  die(
    "Could not find uv or uvx.\n" +
    "  • Install uv globally: https://docs.astral.sh/uv/getting-started/installation/\n" +
    `  • Or place a standalone uv/uvx binary in: ${pythonDir}`
  );
}

const { bin: uvBin, args: uvArgs } = resolveUvx();

// 4. Run PyInstaller via uvx
const launcherPath = path.join(PROJECT_ROOT, "launcher.py");
if (!fs.existsSync(launcherPath)) die(`launcher.py not found at: ${launcherPath}`);

const iconPath = path.join(PROJECT_ROOT, "icon.ico");
if (!fs.existsSync(iconPath)) warn("icon.ico not found — building without icon.");

const iconFlag = fs.existsSync(iconPath) ? `--icon "${iconPath}"` : "";

const pyinstallerCmd = [
  uvBin,
  ...uvArgs,
  "--onefile",
  `--name "${name}"`,
  iconFlag,
  `--distpath "${RELEASE_DIR}"`,
  `"${launcherPath}"`,
].filter(Boolean).join(" ");

log(`Running: ${pyinstallerCmd}`);
try {
  execSync(pyinstallerCmd, { stdio: "inherit", cwd: PROJECT_ROOT });
  ok("PyInstaller finished.");
} catch (err) {
  die(`PyInstaller failed: ${err.message}`);
}

const DIRS_TO_COPY = [
  "Backend",
  "ModelProvider",
  "Pipeline",
  "Tools",
  "python",
  "Settings",
  "frontend",
  "icons",
  "capabilities"
];

log("Copying project directories into Release/ …");

for (const dir of DIRS_TO_COPY) {
  const src  = path.join(PROJECT_ROOT, dir);
  const dest = path.join(RELEASE_DIR,  dir);
  log(`  ${dir}  →  Release/${dir}`);
  copyDirSync(src, dest);
}

const tauriToml = path.join(PROJECT_ROOT, "Tauri.toml");
if (fs.existsSync(tauriToml)) {
  fs.copyFileSync(tauriToml, path.join(RELEASE_DIR, "Tauri.toml"));
  log("  Tauri.toml  →  Release/Tauri.toml");
}

ok("All directories copied.");
ok(`Build complete! Output: ${RELEASE_DIR}`);
