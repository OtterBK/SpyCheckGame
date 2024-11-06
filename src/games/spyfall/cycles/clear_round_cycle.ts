import { Interaction } from "discord.js";
import { CycleType } from "../../common/game_cycle";
import { GameUI } from "../../common/game_ui";
import { SpyCheckCore } from "../spyfall_core";
import { sleep } from "../../../utils/utility";
import { getLogger } from "../../../utils/logger";
import { BGM_TYPE } from "../../../managers/bgm_manager";
import { SpyCheckCycle } from "../spyfall_cycle";
const logger = getLogger('SpyCheckClearRound');

export class ClearRoundCycle extends SpyCheckCycle
{
  constructor(game_core: SpyCheckCore)
  {
    super(game_core, `SpyCheckClearRound`);
  }

  async enter(): Promise<boolean>
  {
    let spy_count = 0;
    for(const user of this.getGameData().getInGameUsers())
    {
      if(this.getGameData().isSpy(user))
      {
        ++spy_count;
      }
    }

    if(spy_count === 0) //스파이가 이제 없다면
    {
      this.getGameData().setGameResult('SPY_LOSE');

      const reason_ui = new GameUI();
      reason_ui.embed
      .setColor(0x004AAD)
      .setTitle('🏁 **[ 게임 종료 ]**')
      .setDescription('🔹 스파이를 모두 찾아냈습니다.')

      this.getGameSession().sendUI(reason_ui);

      this.getGameSession().playBGM(BGM_TYPE.SCORE_ALARM);
    }
    else if(spy_count >= this.getGameData().getInGameUsers().length / 2) //스파이가 과반수 이상이면
    {
      this.getGameData().setGameResult('SPY_WIN');

      const reason_ui = new GameUI();
      reason_ui.embed
      .setColor(0xD92334)
      .setTitle('🏁 **[ 게임 종료 ]**')
      .setDescription('🔹 스파이가 과반수 이상입니다.')

      this.getGameSession().sendUI(reason_ui);
      this.getGameSession().playBGM(BGM_TYPE.PLING);
    }
    else if(this.getGameData().getQuestionList().length === 0) //낼 질문이 없다면
    {
      this.getGameData().setGameResult('SPY_WIN');

      const reason_ui = new GameUI();
      reason_ui.embed
      .setColor(0xD92334)
      .setTitle('🏁 **[ 게임 종료 ]**')
      .setDescription('🔹 더 이상 낼 질문이 없습니다.\n🔹 스파이가 모든 질문을 버텨냈습니다.')

      this.getGameSession().sendUI(reason_ui);
      this.getGameSession().playBGM(BGM_TYPE.PLING);
    }

    await sleep(3000);

    return true;
  }

  async act(): Promise<boolean> 
  {
    if(this.getGameData().getGameResult() === 'NULL') //게임 아직 안끝났다면
    {
      this.setNextCycleType(CycleType.PREPARE_ROUND); //다시 라운드 진행
      return true;
    }

    //끝났다?
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