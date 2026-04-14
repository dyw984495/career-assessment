import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { cloudflare } from "@cloudflare/vite-plugin";
export default defineConfig({
    plugins: [react(), cloudflare()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        host: '0.0.0.0',
    },
    build: {
        outDir: 'dist',
        rollupOptions: {
            output: {
                manualChunks: undefined,
            },
        },
    },
    // Cloudflare Pages 适配
    define: {
        // 确保全局变量在 Edge Runtime 中可用
        'process.env.NODE_ENV': JSON.stringify('production'),
    },
});
