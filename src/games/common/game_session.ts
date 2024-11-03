import { Guild, GuildMember, Interaction } from "discord.js";
import { createAudioPlayer, AudioPlayer, NoSubscriberBehavior, StreamType, createAudioResource } from "@discordjs/voice";
import { GameTable } from "./game_table";
import { GameCore } from "./game_core";
import { GameUI } from "./game_ui";
import { CycleType } from "./game_cycle";
import { getLogger } from "../../utils/logger";
import { generateUUID, getAbsolutePath } from "../../utils/utility";
import { BGM_TYPE } from "../../managers/bgm_manager";
import path from "path";
import { existsSync } from "fs";
const logger = getLogger('GameSession');

export class GameSession
{
  static GAME_SESSIONS: Map<string, GameSession> = new Map<string, GameSession>();

  private uuid: string;

  private host: GuildMember | null = null;
  private audio_player: AudioPlayer;
  private game_core: GameCore | null = null;
  
  private tables: Array<GameTable> = [];
  private participants: Array<GuildMember> = [];
  
  constructor()
  {
    this.uuid = generateUUID();

    this.audio_player = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Play, //구독 중인 voice가 없어도 재생 계속
      },
    });

    GameSession.GAME_SESSIONS.set(this.uuid, this);
  }
  
  setHost(host: GuildMember)
  {
    this.host = host;

    if(this.participants.includes(host) === false)
    {
      this.participants.push(this.host);
    }
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

  isParticipant(user_id: string): boolean
  {
    for(const user of this.participants)
    {
      if(user.id === user_id)
      {
        return true;
      }
    }

    return false;
  }

  getHost(): GuildMember | null
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
    if(this.host?.id === user_id) //나간게 호스트?
    {
      this.expire();
      return;
    }

    this.participants = this.participants.filter((user: GuildMember) => user.id !== user_id);
  }

  sendUI(ui: GameUI): void
  {
    for(const table of this.tables)
    {
      table.sendUI(ui);
    }
  }

  editUI(ui: GameUI): void
  {
    for(const table of this.tables)
    {
      table.editUI(ui);
    }
  }

  deleteUI(): void
  {
    for(const table of this.tables)
    {
      table.deleteUI();
    }
  }

  sendMessage(content: string): void
  {
    for(const table of this.tables)
    {
      table.sendMessage(content);
    }
  }

  playBGM(bgm_type: BGM_TYPE): void
  {
    if (!this.audio_player) 
    {
      return;
    }

    const bgm_resource_path = getAbsolutePath(process.env.BGM_PATH); 
    const bgm_file_path = bgm_resource_path + "/" + bgm_type;

    if(existsSync(bgm_file_path) === false)
    {
      logger.error(`The bgm ${bgm_file_path} is not exists`);
      return;
    }

    this.audio_player.play(
      createAudioResource(bgm_file_path,
        {
          inputType: StreamType.WebmOpus,
          inlineVolume: false,
        }
      )
    );
  }

  stopAudio(): void
  {
    if(!this.audio_player) 
    {
      return;
    }

    this.audio_player.stop();
  }

  relayInteraction(interaction: Interaction): void
  {
    if(this.game_core?.isInGame() === false && this.isParticipant(interaction.user.id) === false)
    {
      return;
    }
    
    this.game_core?.onInteractionCreated(interaction);
  }

  expire(): void
  {
    logger.info(`Expiring game session. host id: ${this.host?.id}`);

    for(const table of this.tables)
    {
      table.expire();
    }

    this.participants = [];

    this.game_core?.expire();
    this.game_core = null;

    GameSession.GAME_SESSIONS.delete(this.uuid);
  }

}

