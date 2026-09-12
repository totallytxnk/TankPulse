import { redisConnection } from '../queue/index.js';
import type { ChannelConfig } from '../types/notification.js';

const KEY_PREFIX = 'tankpulse:channel:';
const REPO_INDEX_PREFIX = 'tankpulse:repo:';

/**
 * Persist a mapping: GitHub repo full_name → Discord channel.
 * One repo can map to multiple channels (we store a set).
 */
export async function setChannelConfig(config: ChannelConfig): Promise<void> {
  const key = `${KEY_PREFIX}${config.channelId}`;
  await redisConnection.set(key, JSON.stringify(config));

  // Secondary index so we can look up channels by repository quickly
  const repoKey = `${REPO_INDEX_PREFIX}${config.repository.toLowerCase()}`;
  await redisConnection.sadd(repoKey, config.channelId);
}

export async function getChannelConfig(
  channelId: string
): Promise<ChannelConfig | null> {
  const raw = await redisConnection.get(`${KEY_PREFIX}${channelId}`);
  if (!raw) return null;
  return JSON.parse(raw) as ChannelConfig;
}

export async function removeChannelConfig(channelId: string): Promise<void> {
  const existing = await getChannelConfig(channelId);
  if (existing) {
    const repoKey = `${REPO_INDEX_PREFIX}${existing.repository.toLowerCase()}`;
    await redisConnection.srem(repoKey, channelId);
  }
  await redisConnection.del(`${KEY_PREFIX}${channelId}`);
}

/**
 * Return all Discord channel IDs that are subscribed to a given repository.
 */
export async function getChannelsForRepo(repository: string): Promise<string[]> {
  const repoKey = `${REPO_INDEX_PREFIX}${repository.toLowerCase()}`;
  return redisConnection.smembers(repoKey);
}
