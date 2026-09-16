import { open, seal, pkceChallenge } from '../../lib/oauth.js';

export default async function handler(request) {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const body = request.headers.get('content-type')?.includes('application/json') ? await request.json() : Object.fromEntries(new URLSearchParams(await request.text()));
  if (body.grant_type !== 'authorization_code') return Response.json({ error: 'unsupported_grant_type' }, { status: 400 });

  let auth;
  try { auth = await open(body.code); } catch (_) { return Response.json({ error: 'invalid_grant' }, { status: 400 }); }
  if (auth.client_id !== body.client_id || auth.redirect_uri !== body.redirect_uri) return Response.json({ error: 'invalid_grant' }, { status: 400 });
  if (!body.code_verifier || await pkceChallenge(body.code_verifier) !== auth.code_challenge) return Response.json({ error: 'invalid_grant' }, { status: 400 });

  const accessToken = await seal({ githubToken: auth.github_token, clientId: auth.client_id, resource: auth.resource, exp: Math.floor(Date.now()/1000) + 8 * 60 * 60 });
  return Response.json({ access_token: accessToken, token_type: 'Bearer', expires_in: 8 * 60 * 60, scope: 'github:read github:write' }, { headers: { 'Cache-Control': 'no-store' } });
}
