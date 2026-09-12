import Fastify from 'fastify';
import { config } from './config.js';
import { githubWebhookRoutes } from './webhooks/github.js';

/**
 * Create and configure the Fastify HTTP server.
 * Critical: we capture the raw body for HMAC verification.
 */
export async function buildServer() {
  const app = Fastify({
    logger: {
      level: config.isDev ? 'info' : 'warn',
    },
    // Trust proxy headers when behind ngrok / localtunnel / reverse proxy
    trustProxy: true,
  });

  // Capture raw body for signature verification.
  // We only do this for the GitHub webhook route content-type.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      try {
        const raw = body as Buffer;
        // Attach raw body so the signature guard can use it
        (req as typeof req & { rawBody: Buffer }).rawBody = raw;
        const json = JSON.parse(raw.toString('utf8'));
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    }
  );

  // Health check
  app.get('/health', async () => ({
    status: 'ok',
    service: 'tankpulse',
    timestamp: new Date().toISOString(),
  }));

  // GitHub webhook routes
  await app.register(githubWebhookRoutes);

  return app;
}

export async function startServer() {
  const app = await buildServer();

  await app.listen({
    port: config.server.port,
    host: config.server.host,
  });

  console.log(
    `[server] listening on http://${config.server.host}:${config.server.port}`
  );

  return app;
}
