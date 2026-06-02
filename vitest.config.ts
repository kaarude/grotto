import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['test/**/*.{test,spec}.{js,ts,jsx,tsx}'],
		setupFiles: ['test/setup.ts'],
		fileParallelism: false,
	},
});
