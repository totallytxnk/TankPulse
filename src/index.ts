import { config } from './config.js';
import { startServer } from './server.js';
import { createDiscordClient, loginDiscord } from './bot/index.js';
import { startNotificationWorker } from './queue/worker.js';

async function main() {
  console.log('Starting TankPulse…');
  console.log(`  NODE_ENV=${process.env.NODE_ENV ?? 'development'}`);
  console.log(`  Redis=${config.redis.url}`);

  // 1. Discord client
  const discord = createDiscordClient();
  await loginDiscord(discord);

  // 2. Rate-limited notification worker
  const worker = startNotificationWorker(discord);

  // 3. HTTP webhook server
  const server = await startServer();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down…`);
    try {
      await server.close();
      await worker.close();
      discord.destroy();
      console.log('Shutdown complete.');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
