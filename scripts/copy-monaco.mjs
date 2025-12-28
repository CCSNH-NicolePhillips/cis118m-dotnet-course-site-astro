import { cpSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

const source = join(root, 'node_modules', 'monaco-editor', 'min', 'vs');
const dest = join(root, 'public', 'monaco', 'vs');

console.log('Copying Monaco assets...');
console.log('From:', source);
console.log('To:', dest);

try {
  mkdirSync(join(root, 'public', 'monaco'), { recursive: true });
  cpSync(source, dest, { recursive: true });
  console.log('✓ Monaco assets copied successfully');
} catch (err) {
  console.error('✗ Failed to copy Monaco assets:', err);
  process.exit(1);
}
