import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';

const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_HASH_PREFIX = 'scrypt';
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export const SESSION_COOKIE_NAME = 'learnmate_session';
export const SESSION_DURATION_SECONDS = 30 * 24 * 60 * 60;
export const DUMMY_PASSWORD_HASH = createPasswordHashPlaceholder();

function createPasswordHashPlaceholder(): string {
  return `${PASSWORD_HASH_PREFIX}$${'00'.repeat(16)}$${'00'.repeat(PASSWORD_KEY_LENGTH)}`;
}

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, PASSWORD_KEY_LENGTH, SCRYPT_OPTIONS, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey);
    });
  });
}

export function createSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = await deriveKey(password, salt);
  return `${PASSWORD_HASH_PREFIX}$${salt}$${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [prefix, salt, expectedHex, extra] = storedHash.split('$');
  if (
    prefix !== PASSWORD_HASH_PREFIX ||
    !/^[a-f0-9]{32}$/i.test(salt || '') ||
    !/^[a-f0-9]{128}$/i.test(expectedHex || '') ||
    extra !== undefined
  ) {
    return false;
  }

  const expected = Buffer.from(expectedHex, 'hex');
  const actual = await deriveKey(password, salt);
  return timingSafeEqual(actual, expected);
}
