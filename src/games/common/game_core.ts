import { Interaction } from "discord.js";
import { GameSession } from "./game_session";
import { CycleType, GameCycle } from "./game_cycle";
import { getLogger } from "../../utils/logger";
import { GameOptions } from "./game_options";
import { GameData } from "./game_data";
const logger = getLogger('GameCore');

export abstract class GameCore
{
  protected game_id: string = 'GameCore';
  protected game_name: string = 'GameCoreName';
  protected min_players: number = 0;
  protected max_players: number = 10;
  protected game_options: GameOptions = new GameOptions();
  protected game_data: GameData = new GameData();

  protected started: boolean = false;

  protected cycle_map: Map<CycleType, GameCycle> = new Map<CycleType, GameCycle>();
  protected current_cycle: GameCycle | null = null;
  
  private game_session: GameSession = new GameSession();
  private expired: boolean = false;

  constructor()
  {

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

    this.current_cycle = cycle;

    let keep_going: boolean = true;
    
    keep_going = await cycle.enter();
    if(keep_going === false)
    {
      return;
    }

    keep_going = await cycle.act();
    if(keep_going === false)
    {
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
