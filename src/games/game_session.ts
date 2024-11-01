import { GuildMember, Interaction } from "discord.js";
import { createAudioPlayer, AudioPlayer, NoSubscriberBehavior } from "@discordjs/voice";
import { GameTable } from "./game_table";
import { GameCore } from "./interfaces/game_core";
import { GameUI } from "./interfaces/game_ui";
import { CycleType } from "./interfaces/game_cycle";
import { getLogger } from "../utils/logger";
const logger = getLogger('GameSession');

export class GameSession
{
  private host: GuildMember;
  private audio_player: AudioPlayer;
  private game_core: GameCore | null = null;
  
  private tables: Array<GameTable> = [];
  private participants: Array<GuildMember> = [];
  
  constructor(host: GuildMember)
  {
    this.host = host;

    this.audio_player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play, //구독 중인 voice가 없어도 재생 계속
      },
    });

    this.participants.push(this.host);
  }

  linkGameCore(game_core: GameCore): void
  {
    this.game_core = game_core;
  }

  startGame(): boolean
  {
    if(!this.game_core)
    {
      return false;
    }

    this.game_core.start();
    return true;
  }

  getAudioPlayer(): AudioPlayer
  {
    return this.audio_player;
  }

  getParticipants(): Array<GuildMember>
  {
    return this.participants;
  }

  getHost(): GuildMember
  {
    return this.host;
  }

  addTable(game_table: GameTable): void
  {
    this.tables.push(game_table);
  }

  removeTable(guild_id: string): void
  {
    this.tables = this.tables.filter((table: GameTable) => table.guild.id !== guild_id);
  }

  findUser(user_id: string): GuildMember | null
  {
    return this.participants.find((user) => user.id === user_id) ?? null;
  }

  addParticipant(user: GuildMember): void
  {
    this.participants.push(user);
  }

  getGameName(): string
  {
    if(!this.game_core)
    {
      return 'CORE_IS_NULL';
    }

    return this.game_core?.getGameName();
  }

  removeParticipant(user_id: string): void
  {
    if(this.host.id === user_id) //나간게 호스트?
    {
      this.expire();
      return;
    }

    this.participants = this.participants.filter((user: GuildMember) => user.id !== user_id);
  }

  sendUIToTable(ui: GameUI, table: GameTable): void
  {
    table.showUI(ui);
  }

  sendUI(ui: GameUI): void
  {
    for(const table of this.tables)
    {
      this.sendUIToTable(ui, table);
    }
  }

  relayInteraction(interaction: Interaction): void
  {
    this.game_core?.onInteractionCreated(interaction);
  }

  expire(): void
  {
    logger.info(`Expiring game session. host id: ${this.host.id}`);

    for(const table of this.tables)
    {
      table.expire();
    }

    this.participants = [];

    this.game_core?.expire();
    this.game_core = null;
  }

}

