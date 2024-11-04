import { Interaction } from "discord.js";
import { SpyCheckCore } from "../spycheck_core";
import { getLogger } from "../../../utils/logger";
import { SpyCheckCycle } from "../spycheck_cycle";
const logger = getLogger('SpyCheckExpire');

export class ExpireCycle extends SpyCheckCycle
{
  constructor(game_core: SpyCheckCore)
  {
    super(game_core, `SpyCheckExipre`);
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