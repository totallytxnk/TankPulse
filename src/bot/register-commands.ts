/**
 * One-shot script to register slash commands with Discord.
 * Run: npm run register-commands
 *
 * Uses guild commands when DISCORD_GUILD_ID is set (instant),
 * otherwise registers globally (can take up to 1 hour to propagate).
 */
import { REST, Routes } from 'discord.js';
import { config } from '../config.js';
import * as configureChannel from './commands/configure-channel.js';

const commands = [configureChannel.data.toJSON()];

async function main() {
  const rest = new REST({ version: '10' }).setToken(config.discord.token);

  try {
    if (config.discord.guildId) {
      console.log(`Registering ${commands.length} guild command(s)…`);
      await rest.put(
        Routes.applicationGuildCommands(
          config.discord.clientId,
          config.discord.guildId
        ),
        { body: commands }
      );
      console.log('Guild commands registered.');
    } else {
      console.log(`Registering ${commands.length} global command(s)…`);
      await rest.put(Routes.applicationCommands(config.discord.clientId), {
        body: commands,
      });
      console.log('Global commands registered (may take up to 1 hour to appear).');
    }
  } catch (err) {
    console.error('Failed to register commands:', err);
    process.exit(1);
  }
}

main();
