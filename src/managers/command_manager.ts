// src/deploy-commands.ts
import { REST, Routes, ChatInputCommandInteraction, GuildMember } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import 'dotenv/config';
import { getLogger } from '../utils/logger';
import checkPermission from '../utils/permission_checker';
import { createGameLobby, createGameSelectMenu, getGameTable } from '../games/factory';
import { RESOURCE_CONFIG } from '../config/resource_config';
import * as fs from 'fs';
const logger = getLogger('CommandManager');

const commands = [
  new SlashCommandBuilder()
    .setName('보드게임')
    .setDescription('보드게임 선택 메뉴를 엽니다.')
    .addStringOption(option => 
      option
        .setName('게임이름')
        .setDescription('선택한 보드게임을 바로 시작합니다.')
        .setRequired(false)
        .addChoices(
          { name: '스파이체크', value: 'SPYCHECK' },
          { name: '스파이폴', value: 'SPYFALL' },
        )
    ),

  new SlashCommandBuilder()
    .setName('강제종료')
    .setDescription('게임 세션을 강제 정리합니다.'),

  new SlashCommandBuilder()
    .setName('새로고침')
    .setDescription('개인 화면을 갱신합니다.'),

  new SlashCommandBuilder()
    .setName('음성재연결')
    .setDescription('봇의 음성 채널 연결을 재시도합니다.'),

  new SlashCommandBuilder()
    .setName('의견')
    .setDescription('의견을 제출합니다.')
    .addStringOption(option => 
      option.setName('내용')
      .setDescription('제출할 의견의 내용을 입력해주세요.')
      .setRequired(true)
    )
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
  if(interaction.channel?.isSendable())
  {
    interaction.channel.send({
      content: `\`\`\`🔹 보드게임 봇의 베타테스트에 참여해주셔서 감사합니다!\n🔹 봇 이용 중 버그나 의견이 있으시면 '/의견' 명령어로 알려주세요.\`\`\``
    });
  }

  const game_id = interaction.options.getString('게임이름') ?? '';
  if(game_id === '')
  {
    createGameSelectMenu(interaction);
    return;
  }

  createGameLobby(interaction, game_id);
});

command_handlers.set('강제종료', (interaction: ChatInputCommandInteraction) =>
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

  interaction.reply({ content: `\`\`\`🔸 ${member.displayName}님이 게임을 강제 종료했어요.\`\`\``, });
  return;
}
);

command_handlers.set('새로고침', async (interaction: ChatInputCommandInteraction) =>
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

    await game_user.sendInteractionReply(interaction, {
      content: '\`\`\`🔸 개인 화면을 갱신했어요!\`\`\`',
      ephemeral: true
    });

    game_user.sendPrivateUI(game_user.getCurrentPrivateUI());

    return;
  }
);

command_handlers.set('음성재연결', async (interaction: ChatInputCommandInteraction) =>
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

    table.reconnectVoice();
    await game_user.sendInteractionReply(interaction, {
      content: '\`\`\`🔸 음성 재연결을 시도했어요!\`\`\`',
      ephemeral: true
    });

    return;
  }
);

command_handlers.set('의견', (interaction: ChatInputCommandInteraction) =>
  {
    const opinion = interaction.options.getString('내용');

    interaction.reply(
      {
        content: `\`\`\`🔸 접수되었습니다. 소중한 의견 감사합니다.\`\`\``,
        ephemeral: true
      }
    )

    const opinion_format = `* ${interaction.user.displayName}[${interaction.user.id}]: ${opinion}\n\n`;

    const feedback_box = RESOURCE_CONFIG.FEEDBACK_PATH;
    fs.appendFile(feedback_box, opinion_format, (err) => 
    {
      if(err)
      {
        logger.error(`Cannot accept feedback by ${err.message}. opinion: ${opinion_format}.`);
      }
    });

  });