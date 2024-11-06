import { Interaction } from "discord.js";
import { GameSession } from "./game_session";
import { CycleType, GameCycle } from "./game_cycle";
import { getLogger } from "../../utils/logger";
import { GameOptions } from "./game_options";
import { GameData } from "./game_data";
import { GameInfo } from "./game_info";
const logger = getLogger('GameCore');

export abstract class GameCore
{
  protected game_id: string;
  protected game_name: string;
  protected min_players: number;
  protected max_players: number;
  protected game_simple_description: string;
  protected game_description: string;
  protected game_thumbnail: string;
  protected game_options: GameOptions = new GameOptions();
  protected game_data: GameData = new GameData();

  protected started: boolean = false;

  protected cycle_map: Map<CycleType, GameCycle> = new Map<CycleType, GameCycle>();
  protected current_cycle: GameCycle | null = null;
  
  private game_session: GameSession = new GameSession();
  private expired: boolean = false;

  constructor(game_info: GameInfo)
  {
    this.game_id = game_info.id;
    this.game_name = game_info.name;
    this.min_players = game_info.min_players;
    this.max_players = game_info.max_players;
    this.game_simple_description = game_info.simple_description;
    this.game_description = game_info.description;
    this.game_thumbnail = game_info.thumbnail;
   
  }

  linkGameSession(game_session: GameSession)
  {
    this.game_session = game_session;
  }
  
  onInteractionCreated(interaction: Interaction): void
  {
    if(!this.current_cycle)
    {
      return;
    }

    if(this.isInGame() && this.game_data.isInGameUser(interaction.user.id) === false) //겜 중에는 인게임인 사람만
    {
      return;
    }

    this.current_cycle.onInteractionCreated(interaction);
  }

  getGameSession(): GameSession
  {
    return this.game_session;
  }

  getGameId(): string
  {
    return this.game_id;
  }
  
  getGameData(): GameData
  {
    return this.game_data;
  }

  isInGame(): boolean
  {
    return this.started;
  }

  gameStarted(): void
  {
    this.started = true;
  }

  setGameOptions(game_options: GameOptions): void
  {
    this.game_options = game_options;
  }

  expire(): void
  {
    this.expired = true;
    this.cycle_map.clear();
    this.current_cycle = null;
  }

  async doCycle(cycle_type: CycleType)
  {
    if(this.expired)
    {
      return;
    }

    const cycle = this.cycle_map.get(cycle_type);
    if(!cycle)
    {
      logger.error(`Cannot find cycle_type ${cycle_type} on ${this.game_id}`);
      return;
    }

    if(cycle.isExpired())
    {
      logger.error(`${this.game_id} called expired cycle enter. stop cycle chain`);
      return;
    }

    this.current_cycle = cycle;

    let keep_going: boolean = true;
    
    keep_going = await cycle.enter();
    if(keep_going === false)
    {
      return;
    }

    if(cycle.isExpired())
    {
      logger.error(`${this.game_id} called expired cycle act. stop cycle chain`);
      return;
    }

    keep_going = await cycle.act();
    if(keep_going === false)
    {
      return;
    }

    if(cycle.isExpired())
      {
        logger.error(`${this.game_id} called expired cycle exit. stop cycle chain`);
        return;
      }

    keep_going = await cycle.exit();
    if(keep_going === false)
    {
      return;
    }

    return cycle.goToNextCycle();
  }

  getGameName(): string
  {
    return this.game_name;
  }

  getGameSimpleDescription(): string
  {
    return this.game_simple_description;
  }

  getGameDescription(): string
  {
    return this.game_description;
  }

  getGameThumbnail(): string
  {
    return this.game_thumbnail;
  }

  getMinPlayers(): number
  {
    return this.min_players;
  }

  getMaxPlayers(): number
  {
    return this.max_players;
  }

  getGameOptions(): GameOptions
  {
    return this.game_options;
  }

  abstract start(): void;
}
