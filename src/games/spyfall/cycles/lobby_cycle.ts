import { RepliableInteraction } from "discord.js";
import { LobbyCycleTemplate } from "../../common/game_cycle";
import { SpyFallCore } from "../spyfall_core";
import { getLogger } from "../../../utils/logger";
import { GameUser } from "../../common/game_user";
const logger = getLogger('SpyFallLobby');

export class LobbyCycle extends LobbyCycleTemplate
{
  constructor(game_core: SpyFallCore)
  {
    super(game_core, `SpyFallLobby`);
  }

  checkCanStartGame(game_user: GameUser, interaction: RepliableInteraction): boolean 
  {
    //스파이폴은 딱히 시작 체크할 거 없음
    return true;
  }
}
