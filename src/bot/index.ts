import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  type Interaction,
} from 'discord.js';
import { config } from '../config.js';
import * as configureChannel from './commands/configure-channel.js';

export interface Command {
  data: { name: string; toJSON: () => unknown };
  execute: (interaction: Interaction) => Promise<void>;
}

export function createDiscordClient(): Client {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  const commands = new Collection<string, Command>();
  commands.set(configureChannel.data.name, configureChannel as Command);

  client.once(Events.ClientReady, (c) => {
    console.log(`[discord] logged in as ${c.user.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (err) {
      console.error(`[discord] command error (${interaction.commandName}):`, err);
      const reply = {
        content: 'Something went wrong while executing this command.',
        ephemeral: true,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  });

  return client;
}

export async function loginDiscord(client: Client): Promise<void> {
  await client.login(config.discord.token);
}
