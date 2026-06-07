import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { splashScreen } from "vite-plugin-splash-screen";
import tsconfigPaths from "vite-tsconfig-paths";

const ignoredDirs = [
    'openchadpy',
    'python',
    'hafidz',
    'Backend',
    'Models',
    'Pipeline',
    'Tools',
    'ModelProvider',
    'Workspaces',
    'build',
    'frontend'
].map(dir => path.resolve(__dirname, dir).replace(/\\/g, '/'))

export default defineConfig(({ mode }) => ({
    plugins: [
        ...(mode === 'development' ? [splashScreen({
            logoSrc: 'logo.svg',
            splashBg: 'black',
            loaderType: "dots",
            loaderBg: "white"
        })] : []),
        react(),
        tailwindcss(),
        tsconfigPaths(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
        dedupe: [
            'react',
            'react-dom',
            'react/jsx-runtime',
            'react/jsx-dev-runtime',
        ]
    },
    server: {
        port: 3000,
        open: false,
        watch: {
            ignored: (p) => {
                const normalized = p.replace(/\\/g, '/');
                if (normalized.includes('/.git/') || normalized.includes('/__pycache__/') || normalized.includes('/.venv/')) {
                    return true;
                }
                return ignoredDirs.some(dir => normalized === dir || normalized.startsWith(dir + '/'));
            }
        },
        proxy: {
            '/ws': {
                target: 'http://127.0.0.1:2048',
                ws: true,
                changeOrigin: true,
            },
            '/Apps': {
                target: 'http://127.0.0.1:2048',
                changeOrigin: true,
            },
            '/api': {
                target: 'http://127.0.0.1:2048',
                changeOrigin: true,
            },
            '/file': {
                target: 'http://127.0.0.1:2048',
                changeOrigin: true,
            },
            '/health': {
                target: 'http://127.0.0.1:2048',
                changeOrigin: true,
            },
        },
        headers: {
            "Content-Security-Policy": [
                "default-src 'self' ipc: http://ipc.localhost",
                "connect-src 'self' ipc: http://ipc.localhost https://esm.sh ws://localhost:*",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' asset: https://asset.localhost data: blob:",
                "frame-src *"
            ].join("; ")
        },
    },
    build: {
        outDir: 'frontend',
        sourcemap: true,
        rollupOptions: {
            // We don't want to bundle these in the main app chunks IF we are loading them from CDN
            // However, the main app also uses them.
            // A hybrid approach: Main app bundles them (as usual), but Dynamic Components load them from CDN.
            // This causes double-loading but ensures easier compatibility.
        }
    },
}))