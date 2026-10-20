// Xuất hợp đồng API ra docs/openapi.json để review trong pull request.
// Chạy: npm run openapi:export -w backend
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { buildOpenApiDocument } from './spec';

const out = path.resolve(__dirname, '../../../docs/openapi.json');
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(buildOpenApiDocument(), null, 2) + '\n');
console.log(`Đã ghi ${out}`);
