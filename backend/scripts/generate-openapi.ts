import fs from 'fs';
import path from 'path';
import os from 'os';
import { specs } from '../src/swagger';

const outputPath = path.resolve(__dirname, '../openapi.json');

try {
  console.log('Generating openapi.json...');
  const content = JSON.stringify(specs, null, 2);
  const eol = fs.existsSync(outputPath) && fs.readFileSync(outputPath, 'utf8').includes('\r\n') ? '\r\n' : '\n';
  fs.writeFileSync(outputPath, content.replace(/\n/g, eol), 'utf8');
  console.log(`✅ openapi.json generated successfully at ${outputPath}`);
} catch (error) {
  console.error('❌ Failed to generate openapi.json:', error);
  process.exit(1);
}
