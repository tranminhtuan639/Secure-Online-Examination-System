import { PrismaClient } from '@prisma/client';

// Cần chạy `npm run db:generate` trước khi build hoặc typecheck.
export const prisma = new PrismaClient();
