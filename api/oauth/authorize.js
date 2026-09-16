import { seal, baseUrl } from '../../lib/oauth.js';

export default async function handler(request) {
  const u = new URL(request.url);
  const required = ['client_id','redirect_uri','response_type','state','code_challenge','code_challenge_method'];
  for (const key of required) if (!u.searchParams.get(key)) return new Response(`Missing ${key}`, { status: 400 });
  if (u.searchParams.get('response_type') !== 'code' || u.searchParams.get('code_challenge_method') !== 'S256') return new Response('Only authorization_code + PKCE S256 is supported.', { status: 400 });

  const redirect = u.searchParams.get('redirect_uri');
  let client = u.searchParams.get('client_id');
  if (client.startsWith('https://')) {
    try {
      const meta = await fetch(client, { headers: { Accept: 'application/json' } });
      const data = await meta.json();
      if (data.client_id !== client || !Array.isArray(data.redirect_uris) || !data.redirect_uris.includes(redirect)) return new Response('Invalid MCP client metadata or redirect URI.', { status: 400 });
    } catch (_) { return new Response('Unable to validate MCP client metadata.', { status: 400 }); }
  }

  const state = await seal({
    client_id: client,
    redirect_uri: redirect,
    response_type: 'code',
    state: u.searchParams.get('state'),
    code_challenge: u.searchParams.get('code_challenge'),
    resource: u.searchParams.get('resource') || `${baseUrl(request)}/api/mcp`,
    exp: Math.floor(Date.now()/1000) + 600,
  });

  const callback = `${baseUrl(request)}/api/github/callback`;
  const github = new URL('https://github.com/login/oauth/authorize');
  github.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID || '');
  github.searchParams.set('redirect_uri', callback);
  github.searchParams.set('state', state);
  github.searchParams.set('code_challenge', u.searchParams.get('code_challenge'));
  github.searchParams.set('code_challenge_method', 'S256');
  github.searchParams.set('prompt', 'select_account');
  return Response.redirect(github.toString(), 302);
}
