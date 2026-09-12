import { EmbedBuilder, Colors } from 'discord.js';
import type { NotificationPayload, NotificationTheme } from '../types/notification.js';

const THEME_COLORS: Record<NotificationTheme, number> = {
  success: Colors.Green, // merged PRs, releases
  danger: Colors.Red, // closed issues, deleted branches
  warning: Colors.Orange, // force pushes, etc.
  info: Colors.Blurple, // pushes, new PRs
  neutral: Colors.Grey,
};

/**
 * Build a rich Discord embed from a normalized NotificationPayload.
 */
export function buildEmbed(payload: NotificationPayload): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setColor(THEME_COLORS[payload.theme] ?? Colors.Blurple)
    .setTitle(payload.title);

  if (payload.description) {
    embed.setDescription(payload.description);
  }

  if (payload.url) {
    embed.setURL(payload.url);
  }

  if (payload.author) {
    embed.setAuthor({
      name: payload.author.name,
      iconURL: payload.author.iconURL,
      url: payload.author.url,
    });
  }

  if (payload.thumbnailURL) {
    embed.setThumbnail(payload.thumbnailURL);
  }

  if (payload.fields?.length) {
    embed.addFields(
      payload.fields.map((f) => ({
        name: f.name,
        value: f.value,
        inline: f.inline ?? false,
      }))
    );
  }

  if (payload.footer) {
    embed.setFooter({ text: payload.footer });
  }

  if (payload.timestamp) {
    embed.setTimestamp(new Date(payload.timestamp));
  } else {
    embed.setTimestamp();
  }

  return embed;
}
