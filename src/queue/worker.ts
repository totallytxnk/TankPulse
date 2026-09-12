import { Worker, type Job } from 'bullmq';
import type { Client, TextChannel } from 'discord.js';
import { config } from '../config.js';
import { redisConnection, NOTIFICATION_QUEUE_NAME } from './index.js';
import { buildEmbed } from '../bot/embeds.js';
import type { NotificationPayload } from '../types/notification.js';

/**
 * Rate-limited BullMQ worker that posts embeds to Discord.
 * Limiter is configured so we stay well under Discord's global rate limits.
 */
export function startNotificationWorker(discord: Client): Worker<NotificationPayload> {
  const worker = new Worker<NotificationPayload>(
    NOTIFICATION_QUEUE_NAME,
    async (job: Job<NotificationPayload>) => {
      const payload = job.data;

      const channel = await discord.channels.fetch(payload.channelId);
      if (!channel || !channel.isTextBased()) {
        throw new Error(`Channel ${payload.channelId} not found or not text-based`);
      }

      const embed = buildEmbed(payload);
      await (channel as TextChannel).send({ embeds: [embed] });

      job.log(`Posted to channel ${payload.channelId} for ${payload.repository}`);
    },
    {
      connection: redisConnection,
      concurrency: 1, // sequential processing + limiter below = predictable rate
      limiter: {
        max: config.queue.rateLimitPerSecond,
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`[worker] job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[worker] job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[worker] error:', err);
  });

  console.log(
    `[worker] started — rate limit ${config.queue.rateLimitPerSecond}/s`
  );

  return worker;
}
