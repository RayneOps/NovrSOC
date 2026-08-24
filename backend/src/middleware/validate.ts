import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Validation middleware factory — apply per-route with a schema (see routes/threat.ts,
// routes/brand.ts, routes/domainSuite.ts for usage).
export function validate(schema: z.ZodSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: result.error.issues.map((e) => ({
                    field: e.path.join('.'),
                    message: e.message,
                })),
            });
            return;
        }
        req.body = result.data; // replace with validated + sanitised data
        next();
    };
}
