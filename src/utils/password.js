import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export const hashPassword = async (password) => {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt}$${Buffer.from(key).toString('hex')}`;
};

export const verifyPassword = async (password, encoded) => {
  const [algorithm, salt, stored] = encoded.split('$');
  if (algorithm !== 'scrypt' || !salt || !stored) return false;
  const derived = Buffer.from(await scrypt(password, salt, KEY_LENGTH));
  const expected = Buffer.from(stored, 'hex');
  return expected.length === derived.length && timingSafeEqual(expected, derived);
};
