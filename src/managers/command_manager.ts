// src/deploy-commands.ts
import { REST, Routes, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import 'dotenv/config';
import { getLogger } from '../utils/logger';
import { createGameSession, GameTable, getGameSession, registerGameSession } from '../games/game_session';
const logger = getLogger('CommandManager');

const commands = [
  new SlashCommandBuilder()
    .setName('보드게임')
    .setDescription('보드게임을 시작합니다.')
    .addStringOption(option => 
      option
        .setName('게임이름')
        .setDescription('플레이하실 보드게임을 입력해주세요.')
        .setRequired(true)
        .addChoices(
          { name: '스파이체크', value: 'SPY_CHECK' },
        )
    )
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN as string);

export async function registerCommands() 
{
  try 
  {
    logger.info('Registering slash commands');

    await rest.put(
      Routes.applicationGuildCommands(process.env.BOT_CLIENT_ID as string, process.env.TEST_GUILD_ID  as string),
      { body: commands }
    );

    logger.info('Registering slash commands');
  }
  catch (error) 
  {
    logger.error(error);
  }
}

type CommandHandler = (interaction: ChatInputCommandInteraction) => void;
const command_handlers: Map<string, CommandHandler> = new Map<string, CommandHandler>();

export function handleCommand(command_name: string, interaction: ChatInputCommandInteraction)
{
  const handler = command_handlers.get(command_name);
  if(handler === undefined)
  {
    return;
  }
    
  handler(interaction);
}

command_handlers.set('보드게임', (interaction: ChatInputCommandInteraction) =>
{
  const guild = interaction.guild;
  const member = interaction.member as GuildMember;
  
  if(!guild || !member)
  {
    interaction.reply({ content: `\`\`\`🔸 개인 채널에서는 사용이 불가능한 명령어에요.\`\`\`` });
    return;
  }

  const channel = interaction.channel;
  if(!channel)
  {
    interaction.reply({ content: `\`\`\`🔸 채팅 채널에서만 사용 가능한 명령어에요.\`\`\`` });
    return;
  }

  const voice = member.voice;
  const voice_channel = member.voice.channel;
  if(!voice || !voice_channel)
  {
    interaction.reply({ content: `\`\`\`🔸 음성 채널에 참가한 뒤 명령어를 입력해주세요.\`\`\`` });
    return;
  }

  const game_id = interaction.options.getString('게임이름') ?? '';
  const game_session = createGameSession(game_id, member);
  if(!game_session)
  {
    interaction.reply({ content: `\`\`\`🔸 ${game_id} 게임은 없네요...😥\`\`\`` });
    return;
  }

  const prev_game_session = getGameSession(guild.id);
  if(prev_game_session)
  {
    interaction.reply({ content: `\`\`\`🔸 이미 이 서버에서 ${prev_game_session.getGameName} 게임을 진행 중이에요.\`\`\`` });
    return;
  }

  const game_table: GameTable = new GameTable(guild, channel, voice_channel);

  registerGameSession(game_table, game_session);
});
