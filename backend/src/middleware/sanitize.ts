// Whitelists fields out of a request body instead of trusting/spreading it wholesale into
// storage. See routes/brand.ts and routes/domainSuite.ts for where this is applied.
export function pickAllowed<T extends object>(
    body: Record<string, unknown>,
    allowed: (keyof T)[]
): Partial<T> {
    const result: Partial<T> = {};
    for (const key of allowed) {
        if (key in body) {
            (result as Record<string, unknown>)[key as string] = body[key as string];
        }
    }
    return result;
}
