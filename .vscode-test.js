import { defineConfig } from '@vscode/test-cli';
import { execSync } from 'child_process';

let vscodePath;
try {
    vscodePath = execSync('readlink -f $(which code)').toString().trim();
} catch {
    try {
        vscodePath = execSync('which code').toString().trim();
    } catch {
        vscodePath = undefined;
    }
}

export default defineConfig({
    files: 'out/test/**/*.test.js',
    version: 'stable',
    vscodeExecutablePath: vscodePath,
    mocha: {
        ui: 'tdd',
        timeout: 10000,
    },
});
