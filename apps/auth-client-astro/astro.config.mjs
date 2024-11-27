// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    vite: {
        envDir: "../../",
        build: {
            // sourcemap: true,
            minify: false,
        }
    }
});
