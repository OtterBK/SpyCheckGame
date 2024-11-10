import { AttachmentBuilder, Interaction } from "discord.js";
import { GameUI } from "../../common/game_ui";
import { SpyFallCore } from "../spyfall_core";
import { sleep } from "../../../utils/utility";
import { getLogger } from "../../../utils/logger";
import { BGM_TYPE } from "../../../managers/bgm_manager";
import { SpyFallCycle } from "../spyfall_cycle";
import { GAME_RESULT_TYPE } from "../spyfall_data";
import { RESOURCE_CONFIG } from "../../../config/resource_config";
const logger = getLogger('SpyFallEnding');

export class EndingCycle extends SpyFallCycle
{
  constructor(game_core: SpyFallCore)
  {
    super(game_core, `SpyFallEnding`);
  }

  async enter(): Promise<boolean>
  {
    return true;
  }
  async act(): Promise<boolean> 
  {
    const game_result = this.getGameData().getGameResult();
    if(game_result === GAME_RESULT_TYPE.CONTINUE)
    {
      logger.error("No Game Result in ending cycle")
      return false;
    }

    const place = this.getGameData().getCurrentPlace();

    let role_list = ``;
    for(const game_user of this.getGameSession().getParticipants())
    {
      const role = this.getGameData().getRole(game_user);
      role_list += `${game_user.getDisplayName()} => ${role?.getName()}\n`;
    }

    const ending_ui = new GameUI();
    ending_ui.embed
    .setColor(0x009900)
    .setTitle('결과')
    .setDescription(`역할 명단:\n${role_list}`)
    .setImage(`attachment://thumbnail.png`)
    .setFooter({text: `장소: ${place.getName()}`})

    if(game_result === GAME_RESULT_TYPE.SPY_WIN)
    {
      ending_ui.embed
      .setTitle('🐱‍👤 **[ 스파이팀 승리! ]**')
    }
    else
    {
      ending_ui.embed
      .setTitle('🤠 **[ 시민팀 승리! ]**')
    }
    
    ending_ui.files.push(
      new AttachmentBuilder(`${RESOURCE_CONFIG.SPYFALL_PATH}/thumbnails/${place.getName()}.png`, {
        name: `thumbnail.png`
      }
    ));

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