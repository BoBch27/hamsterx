import { context } from 'esbuild';

const isDev = process.argv.includes('--watch');

// helper to build+watch a specific config
const buildOrWatch = async (config, label) => {
    const ctx = await context(config);
    if (isDev) {
        await ctx.watch();
        console.log(`👀 Watching ${label}...`);
    } else {
        await ctx.rebuild();
        await ctx.dispose();
        console.log(`✅ Built ${label}`);
    }
};

const commonConfig = {
    entryPoints: ['src/index.js'],
    bundle: true,
    minify: true,
    target: 'es6',
    sourcemap: isDev,
};

// IIFE version for <script src="...">
await buildOrWatch({
    ...commonConfig,
    outfile: 'dist/hamsterjs.min.js',
    format: 'iife',
}, 'IIFE');

// ESM version for npm imports
await buildOrWatch({
    ...commonConfig,
    outfile: 'dist/hamsterjs.esm.js',
    format: 'esm',
}, 'ESM');