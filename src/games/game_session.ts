import { Guild, GuildMember, TextBasedChannel, TextChannel, User, VoiceBasedChannel, VoiceChannel } from "discord.js";
import { GameInfo, getGameInfo } from "./game_data";

const GAME_SESSION_MAP = new Map<string, GameSession>();

export function registerGameSession(game_table: GameTable, game_session: GameSession): void
{
  if(getGameSession(game_table.guild.id))
  {
    return;
  }

  GAME_SESSION_MAP.set(game_table.guild.id, game_session);
  game_session.addTable(game_table);
}

export function getGameSession(guild_id: string): GameSession | null
{
  return GAME_SESSION_MAP.get(guild_id) ?? null;
}

export function createGameSession(game_type: string, member: GuildMember): GameSession | null
{
  const game_info = getGameInfo(game_type);
  if(!game_info)
  {
    return null;
  }

  return new GameSession(game_info, member);
}

export class GameTable //게임을 진행하는 일종의 테이블(책상)
{
  public guild: Guild;
  public channel: TextBasedChannel;  
  public voice_channel: VoiceBasedChannel;

  constructor(guild: Guild, channel: TextBasedChannel, voice_channel: VoiceBasedChannel)
  {
    this.guild = guild;
    this.channel = channel;
    this.voice_channel = voice_channel;
  }
}

export class GameSession
{
  private game_name: string;
  private host: GuildMember;
  private participants: Array<User> = [];
  private tables: Array<GameTable> = [];

  constructor(game_info: GameInfo, host: GuildMember)
  {
    this.game_name = game_info.name;
    this.host = host;
  }

  getGameName(): string
  {
    return this.game_name;
  }

  addTable(game_table: GameTable): void
  {
    if(!game_table)
    {
      return;
    }

    this.tables.push(game_table);
  }

  sendUI(table: GameTable): void
  {

  }

  sendUIToTables(): void
  {
    for(const table of this.tables)
    {
      this.sendUI(table);
    }
  }
}

