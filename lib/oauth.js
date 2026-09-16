import { compactDecrypt, compactEncrypt } from 'jose';

const enc = new TextEncoder();

function key() {
  const secret = process.env.MCP_ENCRYPTION_SECRET;
  if (!secret || secret.length < 32) throw new Error('MCP_ENCRYPTION_SECRET must be at least 32 characters');
  return crypto.subtle.digest('SHA-256', enc.encode(secret)).then((buf) => new Uint8Array(buf));
}

export async function seal(payload) {
  const k = await key();
  return new compactEncrypt(enc.encode(JSON.stringify(payload)))
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .encrypt(k);
}

export async function open(token) {
  const k = await key();
  const { plaintext } = await compactDecrypt(token, k);
  const payload = JSON.parse(new TextDecoder().decode(plaintext));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

export function baseUrl(req) {
  return process.env.APP_URL || new URL(req.url).origin;
}

export async function pkceChallenge(verifier) {
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(verifier));
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
