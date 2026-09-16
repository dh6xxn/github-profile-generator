# GitHub Profile Generator MCP

This repository now includes a remote MCP server at `/api/mcp`.

## What it does

ChatGPT can use the MCP server to:

- authenticate the user through the MCP OAuth flow backed by GitHub
- read the authenticated GitHub profile
- inspect repositories
- read the existing profile README
- generate a README using the profile-generator template
- update the user's `USERNAME/USERNAME/README.md` after explicit confirmation

No OpenAI API key is used by this project. ChatGPT is the AI interface; the MCP server only provides GitHub data and the deterministic README template.

## Required Vercel environment variables

```text
APP_URL=https://YOUR-MCP-DOMAIN
GITHUB_CLIENT_ID=your_github_app_client_id
GITHUB_CLIENT_SECRET=your_github_app_client_secret
MCP_ENCRYPTION_SECRET=a-long-random-secret-at-least-32-characters
```

`MCP_ENCRYPTION_SECRET` encrypts the short-lived MCP authorization code and access token envelopes. Never commit it.

## GitHub App

Create a GitHub App and enable user authorization. Configure the callback URL as:

```text
https://YOUR-MCP-DOMAIN/api/github/callback
```

Request only the repository permissions needed by the product. For the write tool, the app needs repository **Contents: Read and write** for repositories the user explicitly makes available to the app.

GitHub Apps are preferred over broad OAuth apps because they support fine-grained repository permissions and short-lived user access tokens.

## ChatGPT connection

The MCP endpoint is:

```text
https://YOUR-MCP-DOMAIN/api/mcp
```

ChatGPT discovers the protected-resource metadata at:

```text
https://YOUR-MCP-DOMAIN/.well-known/oauth-protected-resource
```

The authorization server metadata is:

```text
https://YOUR-MCP-DOMAIN/.well-known/oauth-authorization-server
```

The MCP authorization flow uses OAuth 2.1 + PKCE and delegates the actual GitHub identity/authorization step to the GitHub App.

## Security note

The current prototype is intentionally stateless: short-lived encrypted authorization codes are carried between the OAuth endpoints. Before public launch, add persistent one-time authorization-code storage (for example, a small database/KV) so an authorization code cannot be replayed during its short lifetime.
