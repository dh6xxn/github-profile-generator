import { protectedResourceHandler, metadataCorsOptionsRequestHandler } from 'mcp-handler';

const handler = protectedResourceHandler({
  authServerUrls: [process.env.APP_URL || 'https://github-profile-generator.vercel.app'],
});

export const GET = handler;
export const OPTIONS = metadataCorsOptionsRequestHandler();
