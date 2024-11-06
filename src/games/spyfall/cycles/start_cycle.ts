import { Interaction } from "discord.js";
import { GameUI } from "../../common/game_ui";
import { SPYFALL_OPTION } from "../spyfall_options";
import { SpyFallCore } from "../spyfall_core";
import { deleteMessage, sleep } from "../../../utils/utility";
import { getLogger } from "../../../utils/logger";
import { BGM_TYPE } from "../../../managers/bgm_manager";
import { SpyFallCycle } from "../spyfall_cycle";
const logger = getLogger('SpyFallStart');

export class StartCycle extends SpyFallCycle
{
  constructor(game_core: SpyFallCore)
  {
    super(game_core, `SpyFallStart`);
  }

  async enter(): Promise<boolean>
  {
    return true;
  }

  async act(): Promise<boolean> 
  {
    const spy_choosing_alert_ui = new GameUI();
    spy_choosing_alert_ui.embed
      .setColor(0xD92334)
      .setTitle('장소 및 역할 선택 중...');

    this.getGameSession().sendUI(spy_choosing_alert_ui);

    await sleep(2000);
      
    //스파이 선정
    this.pickRandomSpy();
    
    //장소 선정

    //역할 분배

    await sleep(2000);

    return true;
  }

  async exit(): Promise<boolean>
  {
    return true;
  }

  onInteractionCreated(interaction: Interaction): void 
  {

  }

  pickRandomSpy()
  {
    let spy_candidates = [];
    for(const participant of this.getGameData().getInGameUsers())
    {
      spy_candidates.push(participant);
    }

    const spy_count = this.getGameCore().getGameOptions().getOption(SPYFALL_OPTION.SPY_COUNT).getSelectedValueAsNumber();
    for(let i = 0; i < spy_count && spy_candidates.length > 0; ++i)
    {
      const random_index = Math.floor(Math.random() * spy_candidates.length);
      const spy = spy_candidates.splice(random_index, 1)[0];
      this.getGameData().addSpy(spy);
    }
  }

}