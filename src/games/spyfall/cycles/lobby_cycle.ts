import { RepliableInteraction } from "discord.js";
import { LobbyCycleTemplate } from "../../common/game_cycle";
import { SpyFallCore } from "../spyfall_core";
import { getLogger } from "../../../utils/logger";
import { GameUser } from "../../common/game_user";
import { SPYFALL_OPTION } from "../spyfall_options";
const logger = getLogger('SpyFallLobby');

export class LobbyCycle extends LobbyCycleTemplate
{
  constructor(game_core: SpyFallCore)
  {
    super(game_core, `SpyFallLobby`);
  }

  checkCanStartGame(game_user: GameUser, interaction: RepliableInteraction): boolean 
  {
    const min_roles_count = 8;
    const spy_count = this.getOption(SPYFALL_OPTION.SPY_COUNT).getSelectedValueAsNumber();
    const participant_count = this.getGameSession().getParticipants().length;

    const missing_spy_count = participant_count - (min_roles_count + spy_count);
    if(missing_spy_count > 0) //스파이가 더 필요?
    {
      game_user.sendInteractionReply(interaction,
        {
          content: `\`\`\`${participant_count}명에서 게임을 하려면 스파이의 수를 ${missing_spy_count}명 더 늘리셔야해요.\`\`\``,
          ephemeral: true
        }
      )
      return false;
    }

  
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
