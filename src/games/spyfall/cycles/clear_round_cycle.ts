import { Interaction } from "discord.js";
import { CycleType } from "../../common/game_cycle";
import { GameUI } from "../../common/game_ui";
import { SpyFallCore } from "../spyfall_core";
import { sleep } from "../../../utils/utility";
import { getLogger } from "../../../utils/logger";
import { BGM_TYPE } from "../../../managers/bgm_manager";
import { SpyFallCycle } from "../spyfall_cycle";
const logger = getLogger('SpyFallClearRound');

export class ClearRoundCycle extends SpyFallCycle
{
  constructor(game_core: SpyFallCore)
  {
    super(game_core, `SpyFallClearRound`);
  }

  async enter(): Promise<boolean>
  {
    return true;
  }

  async act(): Promise<boolean> 
  {
    //스파이폴은 무조건 1라운드임
    this.setNextCycleType(CycleType.ENDING);
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