import { Interaction } from "discord.js";
import { GameUI } from "../../common/game_ui";
import { SpyCheckCore } from "../spyfall_core";
import { sleep } from "../../../utils/utility";
import { getLogger } from "../../../utils/logger";
import { BGM_TYPE } from "../../../managers/bgm_manager";
import { SpyCheckCycle } from "../spyfall_cycle";
const logger = getLogger('SpyCheckEnding');

export class EndingCycle extends SpyCheckCycle
{
  constructor(game_core: SpyCheckCore)
  {
    super(game_core, `SpyCheckEnding`);
  }

  async enter(): Promise<boolean>
  {
    return true;
  }
  async act(): Promise<boolean> 
  {
    const game_result = this.getGameData().getGameResult();
    if(game_result === 'NULL')
    {
      logger.error("No Game Result in ending cycle")
      return false;
    }

    const spy_win = game_result === 'SPY_WIN' ? true : false;

    const spy_list = this.getGameData().getSpyListString();

    const ending_ui = new GameUI();
    ending_ui.embed
    .setColor(0x009900)
    .setTitle('결과')
    .setDescription(`스파이 명단:\n${spy_list}`)

    if(spy_win)
    {
      ending_ui.embed
      .setTitle('🐱‍👤 **[ 스파이팀 승리! ]**')
    }
    else
    {
      ending_ui.embed
      .setTitle('🤠 **[ 시민팀 승리! ]**')
    }

    this.getGameSession().playBGM(BGM_TYPE.FINISH);
    this.getGameSession().sendUI(ending_ui);
    await sleep(3000);

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