// src/index.ts
import { Client, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';
import { registerCommands, registerGlobalCommands } from './managers/command_manager';
import { getLogger } from './utils/logger';
const logger = getLogger("Main");
import { handleCommand } from './managers/command_manager';
import { relayInteraction } from './games/factory';
import { KoreanbotsClient } from 'koreanbots';

const client = new KoreanbotsClient({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
  koreanbots: {
    api: {
        token: process.env.KOREAN_BOT_TOKEN ?? ''
    }
  },
  koreanbotsClient: {
    updateInterval: 1800000 //10분마다 서버 수를 업데이트합니다. (기본값 30분)
  }
});

client.once('ready', async () => 
{
  // 명령어 등록 함수 호출
  // registerCommands();
  registerGlobalCommands();

  logger.info('Board game bot is ready!');
  client.user?.setActivity(`/보드게임`);
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
