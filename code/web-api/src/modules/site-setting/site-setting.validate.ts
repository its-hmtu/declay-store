import { z } from 'zod';

const keyField = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9._-]+$/, 'Key may only contain letters, numbers, dots, hyphens, and underscores');

const valueField = z.string().max(10000).nullable();

export const settingKeySchema = z.object({
  key: keyField,
});

export const upsertSettingSchema = z.object({
  value: valueField,
});

export const bulkUpsertSettingSchema = z.object({
  settings: z.record(keyField, valueField).refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one setting must be provided',
  }),
});

export type UpsertSettingRequest = z.infer<typeof upsertSettingSchema>;
export type BulkUpsertSettingRequest = z.infer<typeof bulkUpsertSettingSchema>;
