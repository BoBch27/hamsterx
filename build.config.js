import { context } from 'esbuild';
import { exec } from 'child_process';

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
    outfile: 'dist/hamsterx.min.js',
    format: 'iife',
}, 'IIFE');

// ESM version for npm imports
await buildOrWatch({
    ...commonConfig,
    outfile: 'dist/hamsterx.esm.js',
    format: 'esm',
}, 'ESM');

// launch live server if dev
if (isDev) {
    exec('npx live-server ./ --port=3000 --open=test/index.html', (err, stdout, stderr) => {
        if (err) {
            console.error(`🚨 live-server error: ${stderr}`);
        } else {
            console.log(stdout);
        }
    });
}