import { createMcpHandler, withMcpAuth } from 'mcp-handler';
import { z } from 'zod';
import { open } from '../lib/oauth.js';

const github = async (token, path, init = {}) => {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2026-03-10',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
};

const handler = createMcpHandler((server) => {
  server.registerTool('get_github_profile', {
    title: 'Get GitHub profile',
    description: 'Read the authenticated GitHub user profile and public profile metadata.',
    inputSchema: z.object({}),
  }, async (_args, ctx) => {
    const token = ctx.http?.authInfo?.extra?.githubToken;
    if (!token) return { content: [{ type: 'text', text: 'GitHub authorization is required.' }] };
    const profile = await github(token, '/user');
    return { content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }] };
  });

  server.registerTool('get_repositories', {
    title: 'Get GitHub repositories',
    description: 'Read the authenticated user\'s repositories so ChatGPT can identify projects, languages and descriptions for the profile README.',
    inputSchema: z.object({
      limit: z.number().int().min(1).max(100).default(30),
    }),
  }, async ({ limit }, ctx) => {
    const token = ctx.http?.authInfo?.extra?.githubToken;
    if (!token) return { content: [{ type: 'text', text: 'GitHub authorization is required.' }] };
    const repos = await github(token, `/user/repos?per_page=${limit}&sort=updated&direction=desc`);
    const compact = repos.map((r) => ({ name: r.name, full_name: r.full_name, html_url: r.html_url, description: r.description, language: r.language, topics: r.topics, stargazers_count: r.stargazers_count, fork: r.fork, updated_at: r.updated_at }));
    return { content: [{ type: 'text', text: JSON.stringify(compact, null, 2) }] };
  });

  server.registerTool('get_existing_profile_readme', {
    title: 'Get existing profile README',
    description: 'Read the authenticated user profile repository README if it exists.',
    inputSchema: z.object({ username: z.string().regex(/^[A-Za-z0-9-]+$/) }),
  }, async ({ username }, ctx) => {
    const token = ctx.http?.authInfo?.extra?.githubToken;
    if (!token) return { content: [{ type: 'text', text: 'GitHub authorization is required.' }] };
    const repo = await github(token, `/repos/${username}/${username}/readme`);
    const decoded = Buffer.from(repo.content || '', 'base64').toString('utf8');
    return { content: [{ type: 'text', text: decoded }] };
  });

  server.registerTool('generate_profile_markdown', {
    title: 'Generate profile README',
    description: 'Turn structured profile information into Markdown using the generator template. ChatGPT supplies the content; this tool handles the formatting.',
    inputSchema: z.object({
      profile: z.object({
        name: z.string(), username: z.string(), headline: z.string().optional(), intro: z.string().optional(), about: z.string().optional(), exploring: z.string().optional(), languages: z.string().optional(), web: z.string().optional(), aiml: z.string().optional(), databases: z.string().optional(), tools: z.string().optional(), bullets: z.string().optional(), focus: z.string().optional(), journey: z.string().optional(), opensource: z.string().optional(), ostitle: z.string().optional(), osdesc: z.string().optional(), buildai: z.string().optional(), buildsec: z.string().optional(), email: z.string().optional(), linkedin: z.string().optional(), instagram: z.string().optional(),
      }),
    }),
  }, async ({ profile }) => {
    const p = profile;
    const badge = (text, logo='github', color='00FFFF') => `![${text}](https://img.shields.io/badge/${encodeURIComponent(text)}-000000?style=for-the-badge&logo=${encodeURIComponent(logo)}&logoColor=black)`;
    const icons = (value) => value ? `![skills](https://skillicons.dev/icons?i=${encodeURIComponent(value.split(',').map(x=>x.trim()).filter(Boolean).join(','))})` : '';
    const lines = [];
    lines.push(`<img src="https://capsule-render.vercel.app/api?type=venom&height=220&color=0:000000,100:a371f7&text=${encodeURIComponent(p.name)}&fontSize=58&fontColor=FFFFFF&animation=fadeIn&fontAlignY=40" width="100%"/>`);
    lines.push(`<h2 align="center">${p.headline || 'Developer'}</h2>`);
    lines.push(`<p align="center"><em>${p.intro || 'Learning, experimenting, and building things.'}</em></p>`);
    lines.push(`<p align="center">${p.email ? `[${badge('Email','gmail') }](mailto:${p.email})` : ''} ${p.linkedin ? `[${badge('LinkedIn','linkedin')} ](${p.linkedin})` : ''} ${p.instagram ? `[${badge('Instagram','instagram')} ](${p.instagram})` : ''}</p>`);
    lines.push('---');
    lines.push(`## 👋 About Me\n\n${p.about || ''}\n\n${(p.bullets || '').split('\n').filter(Boolean).map(x=>`* ${x}`).join('\n')}`);
    lines.push('---');
    if (p.exploring) lines.push(`## 🧠 What I'm Exploring\n\n${p.exploring.split('\n').filter(Boolean).map(x=>{const [name,logo='github']=x.split('|');return badge(name,logo)}).join(' ')}`);
    lines.push(`## 🛠️ Tech Stack\n\n### 💻 Languages\n\n${icons(p.languages)}\n\n### 🌐 Web Development\n\n${icons(p.web)}\n\n### 🤖 AI / ML\n\n${icons(p.aiml)}\n\n### 🗄️ Databases\n\n${icons(p.databases)}\n\n### ⚙️ Tools & Environment\n\n${icons(p.tools)}`);
    lines.push('---');
    lines.push(`## 📊 GitHub Statistics\n\n<p align="center"><img height="180" src="https://github-readme-stats.vercel.app/api?username=${encodeURIComponent(p.username)}&show_icons=true&theme=dark&hide_border=true"/><img height="180" src="https://streak-stats.demolab.com?user=${encodeURIComponent(p.username)}&theme=dark&hide_border=true"/></p>`);
    lines.push(`## 📈 Contribution Activity\n\n<p align="center"><img src="./profile/contribution-calendar.svg" width="100%"/></p>`);
    lines.push(`## 🐍 Contribution Snake\n\n<p align="center"><picture><source media="(prefers-color-scheme: dark)" srcset="./profile/github-snake-dark.svg"/><source media="(prefers-color-scheme: light)" srcset="./profile/github-snake.svg"/><img src="./profile/github-snake.svg" width="100%"/></picture></p>`);
    lines.push('---');
    lines.push(`## 🚀 Open Source\n\n${p.ostitle ? `[${p.ostitle}](${p.opensource || `https://github.com/${p.username}`})` : ''}\n\n${p.osdesc || ''}`);
    lines.push(`## 🏆 GitHub Trophies\n\n<p align="center"><img src="https://trophy.ryglcloud.net/?username=${encodeURIComponent(p.username)}&theme=dark&no-frame=true&no-bg=true&row=1&column=6" width="90%"/></p>`);
    lines.push(`## 🚀 What I'm Building\n\n| 🤖 AI / ML | 🔐 Cybersecurity |\n|---|---|\n| ${p.buildai || ''} | ${p.buildsec || ''} |`);
    lines.push(`## 🎯 Current Focus\n\n\`\`\`text\n${p.focus || ''}\n\`\`\``);
    lines.push(`## 🌱 Learning Journey\n\n\`\`\`text\n${p.journey || ''}\n\`\`\``);
    lines.push(`## 🤝 Let's Connect\n\n${p.email ? `[Gmail](mailto:${p.email})` : ''} ${p.linkedin ? `• [LinkedIn](${p.linkedin})` : ''} ${p.instagram ? `• [Instagram](${p.instagram})` : ''} • [GitHub](https://github.com/${encodeURIComponent(p.username)})`);
    lines.push('---\n\n<p align="center"><strong>Thanks for visiting my profile! 🚀</strong></p>');
    return { content: [{ type: 'text', text: lines.join('\n\n') }] };
  });

  server.registerTool('update_profile_readme', {
    title: 'Update GitHub profile README',
    description: 'Replace the README.md in the authenticated user profile repository. This is a write action and should only be called after the user explicitly confirms the final Markdown.',
    inputSchema: z.object({ username: z.string().regex(/^[A-Za-z0-9-]+$/), markdown: z.string().min(1), commit_message: z.string().default('Update profile README') }),
  }, async ({ username, markdown, commit_message }, ctx) => {
    const token = ctx.http?.authInfo?.extra?.githubToken;
    if (!token) return { content: [{ type: 'text', text: 'GitHub authorization is required.' }] };
    const path = `/repos/${username}/${username}/contents/README.md`;
    let sha;
    try { sha = (await github(token, path)).sha; } catch (_) {}
    const body = { message: commit_message, content: Buffer.from(markdown, 'utf8').toString('base64'), ...(sha ? { sha } : {}) };
    const result = await github(token, path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { content: [{ type: 'text', text: `Updated ${result.content?.html_url || `https://github.com/${username}/${username}/blob/main/README.md`}` }] };
  });
}, { serverInfo: { name: 'GitHub Profile Generator', version: '0.2.0' } });

const verifyToken = async (_req, bearerToken) => {
  if (!bearerToken) return undefined;
  try {
    const payload = await open(bearerToken);
    if (!payload.githubToken) return undefined;
    const me = await github(payload.githubToken, '/user');
    return { token: bearerToken, scopes: ['github:read', 'github:write'], clientId: me.login, extra: { userId: me.id, githubToken: payload.githubToken, login: me.login } };
  } catch (_) { return undefined; }
};

const authHandler = withMcpAuth(handler, verifyToken, { required: true, requiredScopes: ['github:read'], resourceMetadataPath: '/.well-known/oauth-protected-resource' });
export default { fetch: authHandler };
