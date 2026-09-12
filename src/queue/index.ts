import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config.js';
import type { NotificationPayload } from '../types/notification.js';

const connection = new IORedis(config.redis.url, {
  maxRetriesPerRequest: null, // required by BullMQ
});

export const NOTIFICATION_QUEUE_NAME = 'tankpulse-notifications';

export const notificationQueue = new Queue<NotificationPayload>(NOTIFICATION_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: Math.floor(config.queue.removeOnComplete / 1000),
    },
    removeOnFail: {
      age: Math.floor(config.queue.removeOnFail / 1000),
    },
  },
});

/**
 * Enqueue one or more notification payloads.
 * Uses jobId derived from payload.id for basic deduplication within the retention window.
 */
export async function enqueueNotifications(
  payloads: NotificationPayload[]
): Promise<void> {
  if (payloads.length === 0) return;

  await notificationQueue.addBulk(
    payloads.map((payload) => ({
      name: 'send-embed',
      data: payload,
      opts: {
        jobId: payload.id,
      },
    }))
  );
}

export { connection as redisConnection };
