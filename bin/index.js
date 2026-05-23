#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import https from 'node:https';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import * as p from '@clack/prompts';
import pc from 'picocolors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function copyDir(src, dest, replacements = {}) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      const srcFile = path.join(src, file);
      const destName = file === '_gitignore' ? '.gitignore' : file;
      const destFile = path.join(dest, destName);
      copyDir(srcFile, destFile, replacements);
    }
  } else {
    const ext = path.extname(src).toLowerCase();
    const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp', '.pdf', '.zip'];
    if (binaryExtensions.includes(ext)) {
      fs.copyFileSync(src, dest);
    } else {
      let content = fs.readFileSync(src, 'utf8');
      for (const [key, value] of Object.entries(replacements)) {
        content = content.replaceAll(key, value);
      }
      fs.writeFileSync(dest, content, 'utf8');
    }
  }
}

/**
 * Return info about a globally-installed uv binary, or null if not found.
 * Prefers `uv` over `uvx` since `uv sync` and `uv tool run` both live there.
 */
function resolveGlobalUv() {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  for (const bin of ['uv', 'uvx']) {
    const result = spawnSync(probe, [bin], { encoding: 'utf8', shell: true });
    if (result.status === 0 && result.stdout.trim()) {
      const resolved = result.stdout.trim().split('\n')[0].trim();
      return { bin, path: resolved };
    }
  }
  return null;
}

/**
 * Resolve the uv standalone download URL for the current platform/arch.
 * Binaries are sourced from the official Astral releases on GitHub.
 */
function getUvDownloadUrl() {
  const base = 'https://github.com/astral-sh/uv/releases/latest/download';

  const platform = process.platform; // 'linux' | 'darwin' | 'win32'
  const arch = process.arch;         // 'x64' | 'arm64' | 'ia32'

  const archMap = {
    x64:   'x86_64',
    arm64: 'aarch64',
    ia32:  'i686',
  };

  const uvArch = archMap[arch] ?? arch;

  if (platform === 'win32') {
    const winArch = arch === 'arm64' ? 'aarch64' : 'x86_64';
    return {
      url:    `${base}/uv-${winArch}-pc-windows-msvc.zip`,
      binary: 'uv.exe',
      isZip:  true,
    };
  }

  if (platform === 'darwin') {
    return {
      url:    `${base}/uv-${uvArch}-apple-darwin.tar.gz`,
      binary: 'uv',
      isZip:  false,
    };
  }

  // Linux (default)
  return {
    url:    `${base}/uv-${uvArch}-unknown-linux-gnu.tar.gz`,
    binary: 'uv',
    isZip:  false,
  };
}

/**
 * Follow HTTP redirects and return the final response.
 */
function fetchWithRedirects(url, maxRedirects = 10) {
  return new Promise((resolve, reject) => {
    let redirectsLeft = maxRedirects;

    function request(currentUrl) {
      https.get(currentUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirectsLeft-- <= 0) return reject(new Error('Too many redirects'));
          return request(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${currentUrl}`));
        }
        resolve(res);
      }).on('error', reject);
    }

    request(url);
  });
}

/**
 * Download the uv standalone binary into `destDir/uv` (or `uv.exe` on Windows).
 * Returns the full path to the binary.
 */
async function downloadUv(destDir) {
  const { url, binary, isZip } = getUvDownloadUrl();
  const archiveName = url.split('/').pop();
  const archivePath = path.join(destDir, archiveName);

  // Download archive
  const res = await fetchWithRedirects(url);
  await pipeline(res, createWriteStream(archivePath));

  // Extract binary
  if (isZip) {
    await runCommand('powershell', [
      '-Command',
      `Expand-Archive -Path "${archivePath}" -DestinationPath "${destDir}" -Force`,
    ], destDir);
  } else {
    await runCommand('tar', ['-xzf', archivePath, '-C', destDir, '--strip-components=1'], destDir);
  }

  // Clean up archive
  fs.rmSync(archivePath, { force: true });

  const binaryPath = path.join(destDir, binary);

  // Make executable on Unix
  if (process.platform !== 'win32') {
    fs.chmodSync(binaryPath, 0o755);
  }

  return binaryPath;
}

/**
 * Spawn a command and return a promise that resolves with the exit code.
 */
function runCommand(cmd, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: true });
    child.on('close', resolve);
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.clear();
  p.intro(pc.bgCyan(pc.black(' OpenChad Create AI-Driven App ')));

  const pkgManager = 'npm';

  //Detect global uv early so we can inform the user
  const globalUv = resolveGlobalUv();

  const project = await p.group(
    {
      path: () =>
        p.text({
          message: 'Where should we create the project?',
          placeholder: './my-openchad-app',
          validate(value) {
            if (value.trim() === '') return 'Please enter a path';
          },
        }),
      install: () =>
        p.confirm({
          message: `Do you want to install dependencies?`,
          initialValue: true,
        }),
    },
    {
      onCancel: () => {
        p.cancel('Operation cancelled.');
        process.exit(0);
      },
    }
  );

  const targetPath = path.resolve(project.path.trim());
  const projectName = path.basename(targetPath);

  const s = p.spinner();
  s.start('Generating project files...');

  const templateDir = path.resolve(__dirname, '../templates', 'openchad');

  if (!fs.existsSync(templateDir)) {
    s.stop('Template directory not found.');
    p.cancel(`Error: Could not find template folder: ${templateDir}`);
    process.exit(1);
  }

  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  } else {
    const files = fs.readdirSync(targetPath);
    if (files.length > 0) {
      s.stop('Target directory is not empty.');
      const proceed = await p.confirm({
        message: 'Target directory is not empty. Proceed anyway?',
        initialValue: false,
      });
      if (!proceed) {
        p.cancel('Operation cancelled.');
        process.exit(0);
      }
      s.start('Generating project files...');
    }
  }

  copyDir(templateDir, targetPath, {
    '{{PROJECT_NAME}}': projectName,
  });

  s.stop('Project structure created!');

  if (project.install) {
    //1. Node dependencies
    const nodeSpinner = p.spinner();
    nodeSpinner.start(`Installing Node dependencies using ${pkgManager}...`);

    const nodeCode = await runCommand(pkgManager, ['install'], targetPath);
    nodeSpinner.stop(
      nodeCode === 0
        ? 'Node dependencies installed successfully!'
        : 'Failed to install Node dependencies.'
    );

    //2. Python dependencies
    const pythonDir = path.join(targetPath, 'python');

    if (fs.existsSync(pythonDir)) {

      // 2a. Always download uv standalone into <project>/python/
      //     (used as a fallback by build.mjs even when global uv is present)
      const uvDownloadSpinner = p.spinner();
      uvDownloadSpinner.start('Downloading uv standalone binary into python/ (build-time fallback)...');

      let localUvPath = null;
      try {
        localUvPath = await downloadUv(pythonDir);
        uvDownloadSpinner.stop(
          `uv standalone downloaded → ${pc.dim(path.relative(targetPath, localUvPath))}`
        );
      } catch (err) {
        uvDownloadSpinner.stop(`Failed to download uv standalone: ${err.message}`);
        p.log.warn('python/ will not have a local uv binary — build.mjs fallback will be unavailable.');
      }

      // 2b. Run uv sync — prefer global uv, fall back to the just-downloaded one
      const syncBin  = globalUv ? globalUv.path  : localUvPath;

      if (syncBin) {
        const pySpinner = p.spinner();
        pySpinner.start(`Installing Python dependencies...`);

        const pyCode = await runCommand(syncBin, ['sync'], pythonDir);
        pySpinner.stop(
          pyCode === 0
            ? 'Python dependencies installed successfully!'
            : 'Failed to install Python dependencies.'
        );
      } else {
        p.log.warn('No uv binary available — skipping Python dependency installation.');
      }
    }
  }

  const relativePath = path.relative(process.cwd(), targetPath);
  const cdInstruction = relativePath ? `cd ${relativePath}\n  ` : '';

  p.outro(pc.green(`Project setup complete! 🚀`));

  console.log(pc.bold('Next steps:'));
  console.log(`  ${pc.cyan(cdInstruction)}${pc.cyan(`${pkgManager} run dev`)}\n`);
}

main().catch((err) => {
  console.error(pc.red('An error occurred during project generation:'), err);
  process.exit(1);
});
