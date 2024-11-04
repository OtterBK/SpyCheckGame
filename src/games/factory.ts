import { Guild, GuildMember, Interaction, TextChannel, VoiceChannel } from "discord.js";
import { GameSession } from "./common/game_session";
import { GameCore } from "./common/game_core";
import { SpyCheckCore } from "./spycheck/spycheck_core";
import { GameTable } from "./common/game_table";
import { GameOptions } from "./common/game_options";

export function createGameCore(game_id: string): GameCore | null
{
  if(game_id === 'SPYCHECK')
  {
    return new SpyCheckCore();
  }

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