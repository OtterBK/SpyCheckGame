import { Interaction } from "discord.js";
import { SpyCheckCore } from "../spycheck_core";
import { getLogger } from "../../../utils/logger";
import { SpyCheckCycle } from "../spycheck_cycle";
const logger = getLogger('SpyCheckPrepareRound');

export class PrepareRoundCycle extends SpyCheckCycle
{
  constructor(game_core: SpyCheckCore)
  {
    super(game_core, `SpyCheckPrepareRound`);
  }

  async enter(): Promise<boolean>
  {
    return true;
  }

  async act(): Promise<boolean> 
  {
    this.getGameData().clearAnswerSelectMap();
    this.getGameData().clearVoteMap();

    const current_question = this.getGameData().popQuestion();
    if(current_question)
    {
      this.getGameData().setCurrentQuestion(current_question);
    }
    else
    {
      logger.error('current question is null. maybe question list is empty') ;
    }

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