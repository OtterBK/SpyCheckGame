import { Interaction } from "discord.js";
import { SpyFallCore } from "../spyfall_core";
import { getLogger } from "../../../utils/logger";
import { SpyFallCycle } from "../spyfall_cycle";
const logger = getLogger('SpyFallPrepareRound');

export class PrepareRoundCycle extends SpyFallCycle
{
  constructor(game_core: SpyFallCore)
  {
    super(game_core, `SpyFallPrepareRound`);
  }

  async enter(): Promise<boolean>
  {
    return true;
  }

  async act(): Promise<boolean> 
  {
    return true;
  }

  async exit(): Promise<boolean>
  {
    return true;
  }

  onInteractionCreated(interaction: Interaction): void 
  {
        
  }

}