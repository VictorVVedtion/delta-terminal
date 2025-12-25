import type { ZodSchema } from 'zod';

/**
 * Zod Schema 验证工具
 */
export function validateSchema<T>(schema: ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function validateSchemaAsync<T>(schema: ZodSchema<T>, data: unknown): Promise<T> {
  return schema.parseAsync(data);
}

export function isValidSchema<T>(schema: ZodSchema<T>, data: unknown): data is T {
  return schema.safeParse(data).success;
}
