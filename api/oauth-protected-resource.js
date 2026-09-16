import { protectedResourceHandler, metadataCorsOptionsRequestHandler } from 'mcp-handler';

const handler = protectedResourceHandler({
  authServerUrls: [process.env.APP_URL || 'https://YOUR-MCP-DOMAIN'],
});

export const GET = handler;
export const OPTIONS = metadataCorsOptionsRequestHandler();
