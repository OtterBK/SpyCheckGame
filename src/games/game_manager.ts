import { Guild, GuildMember, Interaction, TextChannel, VoiceChannel } from "discord.js";
import { GameSession } from "./game_session";
import { GameCore } from "./interfaces/game_core";
import { SpyCheckCore } from "./spycheck/spycheck_core";
import { GameTable } from "./game_table";

export function createGameCore(game_id: string): GameCore | null
{
  if(game_id === 'SPY_CHECK')
  {
    return new SpyCheckCore();
  }

  return null;
}

export function createGameSession( member: GuildMember): GameSession
{
  return new GameSession(member);
}

export function relayInteraction(interaction: Interaction): void
{
  const guild = interaction.guild;
  if(!guild)
  {
    return;
  }

  const table = getGameTable(guild.id);
  if(!table)
  {
    return;
  }

  table.relayInteraction(interaction);
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
