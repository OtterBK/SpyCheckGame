// src/deploy-commands.ts
import { REST, Routes, ChatInputCommandInteraction, GuildMember, TextChannel, VoiceChannel } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import 'dotenv/config';
import { getLogger } from '../utils/logger';
import checkPermission from '../utils/permission_checker';
import { createGameCore, createGameSession, createGameTable, getGameOptionsToCache, getGameTable } from '../games/factory';
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
          { name: '스파이체크', value: 'SPYCHECK' },
        )
    ),

  new SlashCommandBuilder()
    .setName('게임정리')
    .setDescription('게임 세션을 강제 정리합니다.'),

    new SlashCommandBuilder()
    .setName('새로고침')
    .setDescription('개인 화면을 갱신합니다.')
];

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN as string);

export async function registerCommands() 
{
  try 
  {
    await rest.put(
      Routes.applicationGuildCommands(process.env.BOT_CLIENT_ID as string, process.env.TEST_GUILD_ID  as string),
      { body: commands }
    );

    logger.info('Registered slash commands');
  }
  catch (error) 
  {
    logger.error(error);
  }
}

export async function registerGlobalCommands() 
{
  try 
  {
    await rest.put(
      Routes.applicationCommands(process.env.BOT_CLIENT_ID as string),
      { body: commands }
    );

    logger.info('Registered global slash commands');
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

  if(checkPermission(interaction) === false)
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
    interaction.reply({ content: `\`\`\`🔸 개인 채널에서는 사용이 불가능한 명령어에요.\`\`\``, ephemeral:true });
    return;
  }

  const channel = interaction.channel as TextChannel;
  if(!channel)
  {
    interaction.reply({ content: `\`\`\`🔸 채팅 채널에서만 사용 가능한 명령어에요.\`\`\``, ephemeral:true });
    return;
  }

  const voice = member.voice;
  const voice_channel = member.voice.channel as VoiceChannel;
  if(!voice || !voice_channel)
  {
    interaction.reply({ content: `\`\`\`🔸 음성 채널에 참가한 뒤 명령어를 입력해주세요.\`\`\``, ephemeral:true });
    return;
  }

  const prev_game_table = getGameTable(guild.id);
  if(prev_game_table)
  {
    interaction.reply({ content: `\`\`\`🔸 이미 이 서버에서 ${prev_game_table.getGameSession()?.getGameName()} 게임을 진행 중이에요.\n🔸 뭔가 문제가 생기신거라면 '/게임정리' 명령어를 사용해보세요.\`\`\``, ephemeral:true });
    return;
  }

  const game_id = interaction.options.getString('게임이름') ?? '';
  const game_core = createGameCore(game_id);
  if(!game_core)
  {
    interaction.reply({ content: `\`\`\`🔸 ${game_id} 게임은 없네요...😥\`\`\``, ephemeral:true });
    return;
  }

  const game_session = createGameSession(member);
  const game_table = createGameTable(guild, channel, voice_channel);
  if(!game_table)
  {
    logger.error(`Cannot create Game table from ${guild.id}`);
    interaction.reply({ content: `\`\`\`🔸 Cannot create game table\`\`\``, ephemeral:true });
    return;
  }

  game_table.createVoiceConnection();
  game_table.registerGameSession(game_session);

  game_session.linkGameCore(game_core);
  game_core.linkGameSession(game_session);

  const started = game_session.startGame();
  if(started === false)
  {
    logger.error(`Cannot Start Game Session from ${guild.id}. game name: ${game_session.getGameName()}`);
    interaction.reply({ content: `\`\`\`🔸 Cannot Start Game Session from ${guild.id}. game name: ${game_session.getGameName()}\`\`\``, ephemeral:true });
    return;
  }

  const option_cache = getGameOptionsToCache(member.guild.id, game_id); //캐싱해둔 옵션 가져오기
  if(option_cache)
  {
    game_core.setGameOptions(option_cache);
  }

  interaction.reply({ content: `\`\`\`🔸 ${game_session.getGameName()} 게임을 준비할게요.\`\`\``, ephemeral:true });
  game_session.findUser(member.id)?.updateInteraction(interaction);
});

command_handlers.set('게임정리', (interaction: ChatInputCommandInteraction) =>
{
  const guild = interaction.guild;
  const member = interaction.member as GuildMember;
  
  if(!guild || !member)
  {
    interaction.reply({ content: `\`\`\`🔸 개인 채널에서는 사용이 불가능한 명령어에요.\`\`\``, ephemeral:true });
    return;
  }

  const table = getGameTable(guild.id);
  if(!table)
  {
    interaction.reply({ content: `\`\`\`🔸 정리할 수 있는 세션이 없어요. guild_id: ${guild.id}\`\`\``, ephemeral:true });
    return;
  }

  table.getGameSession()?.expire();
  table.expire();

  interaction.reply({ content: `\`\`\`🔸 ${member.displayName}님이 세션을 강제 정리했어요.\`\`\``, });
  return;
}
);

command_handlers.set('새로고침', (interaction: ChatInputCommandInteraction) =>
  {
    const guild = interaction.guild;
    const member = interaction.member as GuildMember;
    
    if(!guild || !member)
    {
      interaction.reply({ content: `\`\`\`🔸 개인 채널에서는 사용이 불가능한 명령어에요.\`\`\``, ephemeral:true });
      return;
    }
  
    const table = getGameTable(guild.id);
    if(!table)
    {
      interaction.reply({ content: `\`\`\`🔸 이 서버는 게임을 진행 중이지 않아요.\`\`\``, ephemeral:true });
      return;
    }
  
    const game_session = table.getGameSession();
    if(!game_session)
    {
      interaction.reply({ content: `\`\`\`🔸 이 서버는 진행 중인 게임 세션이 없어요.\`\`\``, ephemeral:true });
      return;
    }

    const game_user = game_session.findUser(interaction.user.id); 
    if(!game_user)
    {
      interaction.reply({ content: `\`\`\`🔸 게임 참가 중이 아니에요.\`\`\``, ephemeral:true });
      return;
    }

    const updated = game_user.updateInteraction(interaction);//private menu 갱신
    if(updated)
    {
      interaction.reply({
        content: '\`\`\`🔸 개인 화면을 갱신했어요!\`\`\`',
        ephemeral: true
      });

      game_user.sendPrivateUI(game_user.getCurrentPrivateUI());
    }
    else
    {
      interaction.reply({
        content: '\`\`\`🔸 개인 화면 갱신에 실패했어요...아마 게임에서 탈락하신 것 같아요.\`\`\`',
        ephemeral: true
      });

    }

    return;
  }
  );