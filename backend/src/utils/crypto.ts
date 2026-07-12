import crypto from 'crypto';

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 };
const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.scryptSync(password, Buffer.from(salt, 'hex'), KEY_LEN, SCRYPT_PARAMS).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  const derived = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), KEY_LEN, SCRYPT_PARAMS).toString('hex');
  return derived === hashHex;
}
