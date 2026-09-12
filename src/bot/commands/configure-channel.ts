import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
} from 'discord.js';
import { setChannelConfig, removeChannelConfig } from '../../utils/channel-store.js';

export const data = new SlashCommandBuilder()
  .setName('configure-channel')
  .setDescription('Link a GitHub repository to this Discord channel for TankPulse notifications')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addStringOption((opt) =>
    opt
      .setName('repository')
      .setDescription('GitHub repository in owner/repo format (e.g. octocat/Hello-World)')
      .setRequired(true)
  )
  .addChannelOption((opt) =>
    opt
      .setName('channel')
      .setDescription('Target channel (defaults to current channel)')
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(false)
  )
  .addBooleanOption((opt) =>
    opt
      .setName('remove')
      .setDescription('Remove the existing mapping for this channel')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const remove = interaction.options.getBoolean('remove') ?? false;
  const channel =
    interaction.options.getChannel('channel') ?? interaction.channel;

  if (!channel || !('id' in channel)) {
    await interaction.reply({
      content: 'Unable to resolve a valid text channel.',
      ephemeral: true,
    });
    return;
  }

  if (remove) {
    await removeChannelConfig(channel.id);
    await interaction.reply({
      content: `Removed TankPulse mapping for <#${channel.id}>.`,
      ephemeral: true,
    });
    return;
  }

  const repository = interaction.options.getString('repository', true).trim();

  // Basic validation: owner/repo
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)) {
    await interaction.reply({
      content:
        'Invalid repository format. Use `owner/repo` (e.g. `vercel/next.js`).',
      ephemeral: true,
    });
    return;
  }

  await setChannelConfig({
    channelId: channel.id,
    repository,
    guildId: interaction.guildId ?? '',
    createdAt: new Date().toISOString(),
  });

  await interaction.reply({
    content: [
      `Linked **${repository}** → <#${channel.id}>`,
      '',
      'Make sure the GitHub webhook for that repository points to your TankPulse `/api/webhooks/github` endpoint and uses the same `WEBHOOK_SECRET`.',
    ].join('\n'),
    ephemeral: true,
  });
}
