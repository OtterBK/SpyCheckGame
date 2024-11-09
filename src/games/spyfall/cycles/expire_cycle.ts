import { Interaction } from "discord.js";
import { SpyFallCore } from "../spyfall_core";
import { getLogger } from "../../../utils/logger";
import { SpyFallCycle } from "../spyfall_cycle";
const logger = getLogger('SpyFallExpire');

export class ExpireCycle extends SpyFallCycle
{
  constructor(game_core: SpyFallCore)
  {
    super(game_core, `SpyFallExpire`);
  }

  async enter(): Promise<boolean>
  {
    return true;
  }
  async act(): Promise<boolean> 
  {
    this.getGameSession().expire();
    this.getGameData().expire();
    this.getGameCore().expire();
    return true;
  }
  async exit(): Promise<boolean>
  {
    return false;
  }

  onInteractionCreated(interaction: Interaction): void 
  {
        
  }


}