import 'dotenv/config';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  discord: {
    token: requireEnv('DISCORD_TOKEN'),
    clientId: requireEnv('DISCORD_CLIENT_ID'),
    guildId: process.env.DISCORD_GUILD_ID || undefined,
  },
  webhook: {
    secret: requireEnv('WEBHOOK_SECRET'),
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  server: {
    port: Number(process.env.PORT) || 3000,
    host: process.env.HOST || '0.0.0.0',
  },
  queue: {
    rateLimitPerSecond: Number(process.env.DISCORD_RATE_LIMIT_PER_SECOND) || 5,
    removeOnComplete: Number(process.env.QUEUE_REMOVE_ON_COMPLETE) || 3_600_000,
    removeOnFail: Number(process.env.QUEUE_REMOVE_ON_FAIL) || 86_400_000,
  },
  isDev: process.env.NODE_ENV !== 'production',
} as const;
