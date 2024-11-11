import { RepliableInteraction } from "discord.js";
import { LobbyCycleTemplate } from "../../common/game_cycle";
import { SpyCheckCore } from "../spycheck_core";
import { getLogger } from "../../../utils/logger";
import { SPYCHECK_OPTION } from "../spycheck_options";
import { GameUser } from "../../common/game_user";
const logger = getLogger('SpyCheckLobby');

export class LobbyCycle extends LobbyCycleTemplate
{
  constructor(game_core: SpyCheckCore)
  {
    super(game_core, `SpyCheckLobby`);
  }

  checkCanStartGame(game_user: GameUser, interaction: RepliableInteraction): boolean 
  {
    const spy_count = this.getOption(SPYCHECK_OPTION.SPY_COUNT).getSelectedValueAsNumber();
    const participant_count = this.getGameSession().getParticipants().length;

    if(spy_count >= participant_count/2)
    {
      game_user.sendInteractionReply(interaction, 
        {
          content: `\`\`\`🔸 설정된 스파이의 수가 게임 참가자의 과반수 이상이에요!\n🔸 스파이 수: ${spy_count}명, 게임 참가자 수: ${participant_count}\`\`\``,
          ephemeral: true
        });
      return false;
    }

    return true;
  }
}
