import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry';

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Secure Exam API',
      version: '0.1.0',
      description:
        'Hợp đồng API của hệ thống thi trắc nghiệm. Sinh tự động từ schema Zod trong shared/. ' +
        'Endpoint ghi "Chưa làm" là hợp đồng đã chốt, chưa có code backend.',
    },
    servers: [{ url: '/' }],
    tags: [
      { name: 'System' },
      { name: 'Auth' },
      { name: 'Account' },
      { name: 'Questions' },
      { name: 'Exams' },
      { name: 'Attempts' },
    ],
  });
}
