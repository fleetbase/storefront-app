/**
 * Generates the app icon or the launch screen from the build's artwork.
 *
 *   yarn generate:app-icon        every iOS and Android icon size
 *   yarn generate:launch-screen   the react-native-bootsplash launch screen
 *
 * A client build keeps its artwork in `brand/` so pulling a release never touches it:
 *
 *   brand/app-icon.png        1024×1024, no transparency for iOS
 *   brand/splash-screen.png   the logo shown on the launch screen
 *
 * Without them the templates in `assets/` are used. The launch screen background is,
 * in order: `--background`, the first `boot.background` color in the brand file, white.
 * Any other flags are passed through to the generator (e.g. `--logo-width=120`).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const [kind, ...args] = process.argv.slice(2);

const artwork = (name) => ['brand', 'assets'].map((dir) => path.join(dir, name)).find((file) => fs.existsSync(path.join(root, file)));

function brandBackground() {
    const file = ['brand/storefront.brand.ts', 'storefront.brand.ts'].map((name) => path.join(root, name)).find((name) => fs.existsSync(name));
    if (!file) return null;
    const match = fs.readFileSync(file, 'utf8').match(/boot\s*:\s*\{[^}]*?background\s*:\s*\[?\s*['"](#[0-9a-fA-F]{3,8})['"]/);
    return match ? match[1] : null;
}

function run(command, commandArgs) {
    console.log(`> ${command} ${commandArgs.join(' ')}`);
    const result = spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit' });
    process.exit(typeof result.status === 'number' ? result.status : 1);
}

const flag = (name) => args.find((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));

if (kind === 'icon') {
    const icon = artwork('app-icon.png');
    if (!icon) throw new Error('No app icon: add brand/app-icon.png (1024×1024).');
    run('npx', ['app-icon', 'generate', '-i', icon, ...args]);
} else if (kind === 'splash') {
    const splash = artwork('splash-screen.png');
    if (!splash) throw new Error('No launch screen logo: add brand/splash-screen.png.');
    const defaults = [];
    if (!flag('background')) defaults.push(`--background=${brandBackground() || '#FFFFFF'}`);
    if (!flag('logo-width')) defaults.push('--logo-width=100');
    if (!flag('flavor')) defaults.push('--flavor=main');
    run('npx', ['react-native', 'generate-bootsplash', splash, ...defaults, ...args]);
} else {
    console.error('Usage: node scripts/generate-app-assets.js <icon|splash> [flags]');
    process.exit(1);
}
