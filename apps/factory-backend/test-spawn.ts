import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const APPDATA = process.env.APPDATA || '';
const claudePath = path.join(APPDATA, 'npm/claude.cmd');

console.log('Testing spawn for:', claudePath);
console.log('Exists:', fs.existsSync(claudePath));

const args = ['--version'];

const proc = spawn(claudePath, args, {
  shell: process.platform === 'win32',
});

let stdout = '';
let stderr = '';

proc.stdout.on('data', (d) => stdout += d);
proc.stderr.on('data', (d) => stderr += d);

proc.on('close', (code) => {
  console.log('Exit code:', code);
  console.log('STDOUT:', stdout.trim());
  console.log('STDERR:', stderr.trim());
});

proc.on('error', (err) => {
  console.error('SPAWN ERROR:', err);
});
