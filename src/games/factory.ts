import { Guild, GuildMember, Interaction, TextChannel, VoiceChannel, RepliableInteraction } from "discord.js";
import { GameSession } from "./common/game_session";
import { GameCore } from "./common/game_core";
import { SpyCheckCore } from "./spycheck/spycheck_core";
import { GameTable } from "./common/game_table";
import { GameOptions } from "./common/game_options";
import { getLogger } from "../utils/logger";
import { GameInfo } from "./common/game_info";
const logger = getLogger('GameFactory')

export function createGameCore(game_id: string): GameCore | null
{
  const game_info = GameInfo.GAME_INFO_MAP.get(game_id);
  if(!game_info)
  {
    logger.error(`Cannot create game core. ${game_id}'s game info is not exist`);
    return null;
  }

  if(game_id === 'SPYCHECK')
  {
    return new SpyCheckCore(game_info);
  }

  logger.error(`Cannot create game core. ${game_id}'s core constructor is not defined`);

  return null;
}

export function createGameSelectMenu(interaction: RepliableInteraction)
{
    return null;
}

export function createGameSession( member: GuildMember): GameSession
{
  const game_session = new GameSession();
  game_session.setHost(member);
  return game_session;
}

export function getGameSessionByUser(user_id: string): GameSession | null
{
  for(const game_session of GameSession.GAME_SESSIONS.values())
  {
    if(game_session.isParticipant(user_id))
    {
      return game_session;
    }
  }

  return null;
}

export function relayInteraction(interaction: Interaction): boolean
{
  const guild = interaction.guild;
  if(guild)
  {
    const table = getGameTable(guild.id);
    if(table) //테이블 있으면 테이블로 relay
    {
      table.relayInteraction(interaction);
      return true;
    }
  }

  if(!interaction.member) //개인 채널에서 한거임
  {
    const game_session = getGameSessionByUser(interaction.user.id);
    if(game_session) //게임 세션 있으면 relay
    {
      game_session.relayInteraction(interaction); 
      return true;
    }
  }

  return false;
}

export function createGameTable(guild: Guild, channel: TextChannel, voice_channel: VoiceChannel): GameTable | null
{
  if(getGameTable(guild.id))
  {
    return null;
  }

  const game_table = new GameTable(guild, channel, voice_channel);
  GameTable.GAME_TABLE_MAP.set(guild.id, game_table);

  return game_table;
}

export function getGameTable(guild_id: string): GameTable | null
{
  return GameTable.GAME_TABLE_MAP.get(guild_id) ?? null;
}


const GAME_OPTIONS_CACHE_MAP = new Map<string, Map<string, GameOptions>>(); 

export function saveGameOptionsToCache(guild_id: string, game_id: string, game_options: GameOptions)
{
  if(!GAME_OPTIONS_CACHE_MAP.get(guild_id))
  {
    GAME_OPTIONS_CACHE_MAP.set(guild_id, new Map<string, GameOptions>());
  }

  const caches = GAME_OPTIONS_CACHE_MAP.get(guild_id);
  if(caches)
  {
    caches.set(game_id, game_options);
  }
}

export function getGameOptionsToCache(guild_id: string, game_id: string): GameOptions | null
{
  const caches = GAME_OPTIONS_CACHE_MAP.get(guild_id);
  if(caches)
  {
    return caches.get(game_id) ?? null;
  }

  return null;

}

export function createGameLobby(interaction: RepliableInteraction, game_id: string)
{
  const guild = interaction.guild;
  const member = interaction.member as GuildMember;

  if(!guild || !member)
  {
    interaction.reply({ content: `\`\`\`🔸 개인 채널에서는 사용이 불가능한 상호작용이에요.\`\`\``, ephemeral:true });
    return;
  }

  const channel = interaction.channel as TextChannel;
  if(!channel)
  {
    interaction.reply({ content: `\`\`\`🔸 채팅 채널에서만 사용 가능한 상호작용이에요.\`\`\``, ephemeral:true });
    return;
  }

  const voice = member.voice;
  const voice_channel = member.voice.channel as VoiceChannel;
  if(!voice || !voice_channel)
  {
    interaction.reply({ content: `\`\`\`🔸 음성 채널에 참가한 뒤 다시 시도해주세요.\`\`\``, ephemeral:true });
    return;
  }

  const prev_game_table = getGameTable(guild.id);
  if(prev_game_table)
  {
    interaction.reply({ content: `\`\`\`🔸 이미 이 서버에서 ${prev_game_table.getGameSession()?.getGameName()} 게임을 진행 중이에요.\n🔸 뭔가 문제가 생기신거라면 '/게임정리' 명령어를 사용해보세요.\`\`\``, ephemeral:true });
    return;
  }

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

  const option_cache = getGameOptionsToCache(guild.id, game_id); //캐싱해둔 옵션 가져오기
  if(option_cache)
  {
    game_core.setGameOptions(option_cache);
  }

  interaction.reply({ content: `\`\`\`🔸 ${game_session.getGameName()} 게임을 준비할게요.\`\`\``, ephemeral:true });
  game_session.findUser(member.id)?.updateInteraction(interaction);
}
