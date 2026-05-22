#!/usr/bin/env node
/**
 * Development script that starts Vite first, waits for it to be ready,
 * detects its port, then starts the Python server with VITE_PORT set.
 */
import { spawn, spawnSync } from 'child_process';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const { name } = require('../package.json');
// Default Vite port  used as fallback if detection fails

const VITE_DEFAULT_PORT = 3000;
// Global process tracking for cleanup
let pythonProcess = null;
let viteProcess = null;
let isCleaningUp = false;

function startProcess(command, args, options = {}, captureOutput = false) {
    const stdio = captureOutput
        ? ['ignore', 'pipe', 'pipe']
        : ['ignore', 'inherit', 'inherit'];
    const proc = spawn(command, args, {
        stdio,
        shell: false,
        detached: process.platform !== 'win32',
        ...options,
    });
    proc.on('error', (err) => {
        if (!isCleaningUp) {
            console.error(`Failed to start ${command}:`, err);
        }
    });
    return proc;
}

function startViteAndDetectPort(vitePath) {
    return new Promise((resolve, reject) => {
        // Pipe stdout/stderr so we can read Vite's output
        viteProcess = startProcess('node', [vitePath], {
            stdio: ['ignore', 'pipe', 'pipe'],
        }, false /* captureOutput flag unused  we set stdio above */);
        let detectedPort = null;
        let settled = false;
        // Relay Vite output to our own stdout while also scanning for the port
        const onData = (chunk) => {
            const text = chunk.toString();
            // process.stdout.write(text); // relay so the developer still sees Vite logs
            if (!detectedPort) {
                // Match "http://localhost:PORT/" or "http://127.0.0.1:PORT/"
                const match = text.match(/https?:\/\/(?:localhost|127\.0\.0\.1):(\d+)/);
                if (match) {
                    detectedPort = parseInt(match[1], 10);
                    console.log(`\nDetected Vite port: ${detectedPort}`);
                }
            }
        };
        viteProcess.stdout.on('data', onData);
        viteProcess.stderr.on('data', onData);
        viteProcess.on('close', (code) => {
            if (!isCleaningUp) {
                console.log(`Vite exited with code ${code}`);
                cleanup(code || 0);
            }
        });
        const fallback = detectedPort ?? VITE_DEFAULT_PORT;
        resolve(fallback);
    });
}
/**
 * Handle cleanup on exit
 */

const cleanup = (exitCode = 0) => {
    if (isCleaningUp) {
        process.exit(exitCode || 1);
        return;
    }
    isCleaningUp = true;
    // Clear current line (in case of \r from waitForServer) and print shutdown msg
    process.stdout.write('\r\x1B[K');
    console.log('\nShutting down development environment...');
    console.log('Cleaning up processes, please wait...\n');
    const killProcessSync = (proc) => {
        if (!proc || !proc.pid) return;
        try {
            if (process.platform === 'win32') {
                spawnSync('taskkill', ['/F', '/T', '/PID', proc.pid.toString()], {
                    stdio: 'ignore'
                });
            } else {
                process.kill(-proc.pid, 'SIGTERM');
            }
        } catch (e) {
            try { proc.kill('SIGKILL'); } catch (err) { }
        }
    };
    killProcessSync(viteProcess);
    killProcessSync(pythonProcess);
    setTimeout(() => {
        if (process.stdin.isTTY) {
            process.stdin.pause();
        }
        process.exit(exitCode);
    }, 200);
};

async function main() {
    console.log('Starting development environment...\n');
    //  Step 1: Start Vite and wait for it to be ready 
    console.log('Starting Vite dev server...\n');
    const vitePath = join(process.cwd(), 'node_modules', 'vite', 'bin', 'vite.js');
    const vitePort = await startViteAndDetectPort(vitePath);
    if (isCleaningUp) return;
    console.log(`\nVite is ready on port ${vitePort}`);
    console.log('\nStarting Python server...');
    pythonProcess = startProcess("uv", ['run', '--project', 'python', 'python/main.py'], {
        cwd: process.cwd(),
        stdio: ['ignore', 'inherit', 'inherit'],
        env: {
            ...process.env,
            DEV_MODE: "true",
            VITE_PORT: String(vitePort),
            APP_NAME: name
        }
    });
}

process.on('SIGINT', () => cleanup(0));
process.on('SIGTERM', () => cleanup(0));
main().catch((err) => {
    if (!isCleaningUp) console.error(err);
});