import { Interaction } from "discord.js";
import { GameSession } from "./game_session";
import { CycleType, GameCycle } from "./game_cycle";
import { getLogger } from "../../utils/logger";
const logger = getLogger('GameCore');

export abstract class GameCore
{
  protected game_id: string = 'GameCore';
  protected game_name: string = 'GameCoreName';
  protected cycle_map: Map<CycleType, GameCycle> = new Map<CycleType, GameCycle>();
  protected current_cycle: GameCycle | null = null;
  
  private game_session: GameSession | null = null;
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

    this.current_cycle.onInteractionCreated(interaction);
  }

  getGameSession(): GameSession | null
  {
    return this.game_session;
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
    
    keep_going = cycle.enter();
    if(keep_going === false)
    {
      return;
    }

    keep_going = cycle.act();
    if(keep_going === false)
    {
      return;
    }

    keep_going = cycle.exit();
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

  abstract start(): void;
}
