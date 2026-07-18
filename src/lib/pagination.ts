import { z } from "zod/v4";

export const paginationQuerySchema = {
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
};

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const DEFAULT_LIMIT = 20;

export function resolvePagination(page?: number, limit?: number) {
  const resolvedLimit = Math.min(limit ?? DEFAULT_LIMIT, 100);
  const resolvedPage = Math.max(page ?? 1, 1);
  const offset = (resolvedPage - 1) * resolvedLimit;
  return { page: resolvedPage, limit: resolvedLimit, offset };
}

export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
