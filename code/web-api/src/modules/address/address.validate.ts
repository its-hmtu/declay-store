import { z } from 'zod';

// Create address validation
export const createAddressSchema = z.object({
  receiverName: z
    .string('Receiver name is required')
    .min(2, 'Receiver name must be at least 2 characters')
    .max(255, 'Receiver name must be less than 255 characters'),
  receiverPhone: z
    .string('Receiver phone is required')
    .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, 'Invalid phone number format'),
  addressLine: z
    .string('Address line is required')
    .min(5, 'Address line must be at least 5 characters')
    .max(255, 'Address line must be less than 255 characters'),
  addressLine2: z
    .string()
    .max(255, 'Address line 2 must be less than 255 characters')
    .optional()
    .nullable(),
  ward: z
    .string('Ward is required')
    .min(2, 'Ward must be at least 2 characters')
    .max(100, 'Ward must be less than 100 characters'),
  district: z
    .string('District is required')
    .min(2, 'District must be at least 2 characters')
    .max(100, 'District must be less than 100 characters'),
  city: z
    .string('City is required')
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must be less than 100 characters'),
  country: z
    .string('Country is required')
    .min(2, 'Country must be at least 2 characters')
    .max(100, 'Country must be less than 100 characters')
    .default('Vietnam'),
  postalCode: z
    .string()
    .regex(/^[0-9]{4,10}$/, 'Invalid postal code format')
    .optional()
    .nullable(),
  isDefault: z
    .boolean('Is default must be a boolean')
    .default(false),
  addressType: z
    .enum(['home', 'work', 'other'])
    .describe('Address type must be one of: home, work, or other'),
});

// Update address validation
export const updateAddressSchema = z.object({
  receiverName: z
    .string()
    .min(2, 'Receiver name must be at least 2 characters')
    .max(255, 'Receiver name must be less than 255 characters')
    .optional(),
  receiverPhone: z
    .string()
    .regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/, 'Invalid phone number format')
    .optional(),
  addressLine: z
    .string()
    .min(5, 'Address line must be at least 5 characters')
    .max(255, 'Address line must be less than 255 characters')
    .optional(),
  addressLine2: z
    .string()
    .max(255, 'Address line 2 must be less than 255 characters')
    .optional()
    .nullable(),
  ward: z
    .string()
    .min(2, 'Ward must be at least 2 characters')
    .max(100, 'Ward must be less than 100 characters')
    .optional(),
  district: z
    .string()
    .min(2, 'District must be at least 2 characters')
    .max(100, 'District must be less than 100 characters')
    .optional(),
  city: z
    .string()
    .min(2, 'City must be at least 2 characters')
    .max(100, 'City must be less than 100 characters')
    .optional(),
  country: z
    .string()
    .min(2, 'Country must be at least 2 characters')
    .max(100, 'Country must be less than 100 characters')
    .optional(),
  postalCode: z
    .string()
    .regex(/^[0-9]{4,10}$/, 'Invalid postal code format')
    .optional()
    .nullable(),
  isDefault: z
    .boolean('Is default must be a boolean')
    .optional(),
  addressType: z
    .enum(['home', 'work', 'other'])
    .describe('Address type must be one of: home, work, or other')
    .optional(),
});

// Set default address validation
export const setDefaultAddressSchema = z.object({
  addressId: z
    .number('Address ID is required')
    .int('Address ID must be an integer')
    .positive('Address ID must be positive'),
});

// Address ID validation (for path parameters)
export const addressIdSchema = z.object({
  id: z
    .string('Address ID is required')
    .regex(/^\d+$/, 'Address ID must be a number')
    .transform(Number)
    .refine((val) => val > 0, 'Address ID must be positive'),
});

// Query parameters validation for listing addresses
export const listAddressesSchema = z.object({
  addressType: z
    .enum(['home', 'work', 'other'])
    .describe('Filter by address type')
    .optional(),
  isDefault: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  limit: z
    .string()
    .default('10')
    .transform(Number)
    .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100')
    .optional(),
  offset: z
    .string()
    .default('0')
    .transform(Number)
    .refine((val) => val >= 0, 'Offset must be non-negative')
    .optional(),
});

// Type exports
export type CreateAddressRequest = z.infer<typeof createAddressSchema>;
export type UpdateAddressRequest = z.infer<typeof updateAddressSchema>;
export type SetDefaultAddressRequest = z.infer<typeof setDefaultAddressSchema>;
export type AddressIdParams = z.infer<typeof addressIdSchema>;
export type ListAddressesQuery = z.infer<typeof listAddressesSchema>;
