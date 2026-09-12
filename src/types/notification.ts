/** Normalized notification payload that the queue worker consumes */

export type NotificationTheme = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

export interface NotificationField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface NotificationPayload {
  /** Unique-ish key for dedup / logging */
  id: string;
  /** Discord channel ID to post into */
  channelId: string;
  /** Repository full_name (owner/repo) */
  repository: string;
  /** Human-readable event title */
  title: string;
  /** Short description / body */
  description?: string;
  /** Embed color theme */
  theme: NotificationTheme;
  /** Author shown in the embed */
  author?: {
    name: string;
    iconURL?: string;
    url?: string;
  };
  /** Thumbnail (usually avatar) */
  thumbnailURL?: string;
  /** Direct link to the GitHub resource */
  url?: string;
  /** Extra structured fields */
  fields?: NotificationField[];
  /** Footer text */
  footer?: string;
  /** ISO timestamp */
  timestamp?: string;
}

export interface ChannelConfig {
  /** Discord channel ID */
  channelId: string;
  /** GitHub repository full_name that this channel is linked to */
  repository: string;
  /** Guild ID for reference */
  guildId: string;
  /** When the mapping was created */
  createdAt: string;
}
