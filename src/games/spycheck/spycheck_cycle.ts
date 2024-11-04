import { GameCycle } from "../common/game_cycle";
import { SpyCheckCore } from "./spycheck_core";
import { SpyCheckGameData } from "./spycheck_data";

export abstract class SpyCheckCycle extends GameCycle
{
  game_data: SpyCheckGameData;

  constructor(game_core: SpyCheckCore, cycle_name: string)
  {
    super(game_core, cycle_name);

    this.game_data = game_core.getGameData() as SpyCheckGameData;
  }

  getGameData(): SpyCheckGameData
  {
    return this.game_data;
  }
}