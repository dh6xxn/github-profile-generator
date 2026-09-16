import { open, seal, baseUrl } from '../../lib/oauth.js';

export default async function handler(request) {
  const u = new URL(request.url);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state');
  if (!code || !state) return new Response('Missing GitHub authorization response.', { status: 400 });

  let auth;
  try { auth = await open(state); } catch (_) { return new Response('Invalid or expired authorization state.', { status: 400 }); }

  const callback = `${baseUrl(request)}/api/github/callback`;
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code, redirect_uri: callback, code_verifier: auth.github_code_verifier }),
  });
  const token = await tokenRes.json();
  if (!token.access_token) return new Response(`GitHub authorization failed: ${token.error_description || token.error || 'unknown error'}`, { status: 400 });

  const accessCode = await seal({
    client_id: auth.client_id,
    redirect_uri: auth.redirect_uri,
    code_challenge: auth.code_challenge,
    resource: auth.resource,
    github_token: token.access_token,
    exp: Math.floor(Date.now()/1000) + 300,
  });

  const redirect = new URL(auth.redirect_uri);
  redirect.searchParams.set('code', accessCode);
  redirect.searchParams.set('state', auth.state);
  return Response.redirect(redirect.toString(), 302);
}
