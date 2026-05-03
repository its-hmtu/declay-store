import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { httpError } from '@/utils/http-error';

export type ValidationSource = 'body' | 'params' | 'query';

export const validate =
  (schema: ZodSchema, source: ValidationSource = 'body') =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const dataToValidate = req[source];
      const validatedData = schema.parse(dataToValidate);
      req[source] = validatedData;
      next();
    } catch (error) {
      next(httpError(400, 'Validation error', error));
    }
  };
