import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [react()],
	root: 'src/web',
	publicDir: false,
	build: {
		outDir: '../../dist/web',
		emptyOutDir: true,
	},
	server: {
		port: 5173,
		strictPort: false,
		proxy: {
			// Proxy API calls to the Hono server in dev.
			'/api': {
				target: 'http://127.0.0.1:4737',
				changeOrigin: false,
			},
		},
	},
});
