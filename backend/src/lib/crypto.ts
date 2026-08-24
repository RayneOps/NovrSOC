import crypto from 'crypto';

// AES-256-GCM helpers for encrypting sensitive fields before they're persisted. Not wired
// into any route yet — the data this was written for (executive emails, breach detail,
// brand assets) is currently held in in-memory arrays (see routes/brand.ts), not a database
// column, so there's nothing to encrypt at rest today. Call encrypt()/decrypt() around the
// read/write path once that data actually lands in Supabase.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32-byte hex string
const ALGORITHM = 'aes-256-gcm';

export function encrypt(plaintext: string): string {
    if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not set');
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decrypt(ciphertext: string): string {
    if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY not set');
    const key = Buffer.from(ENCRYPTION_KEY, 'hex');
    const [ivHex, tagHex, encHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encrypted = Buffer.from(encHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(encrypted) + decipher.final('utf8');
}
