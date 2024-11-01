// src/index.ts
import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';
import { registerCommands } from './managers/command_manager';
import { getLogger } from './utils/logger';
const logger = getLogger("Main");
import { handleCommand } from './managers/command_manager';
import { relayInteraction } from './games/game_manager';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => 
{
  // 명령어 등록 함수 호출
  registerCommands();

  logger.info('Board game bot is ready!');
});

client.on('interactionCreate', async (interaction) => 
{
  if (interaction.isChatInputCommand()) 
  {
    const command_name = interaction.commandName;
    handleCommand(command_name, interaction);
  }
  else
  {
    relayInteraction(interaction);
  }
});
 
client.login(process.env.BOT_TOKEN);

process.on('uncaughtException', (err) => 
{
  logger.error(`Cannot Handle Uncaught Error. err: ${err.stack}`);
}
);
