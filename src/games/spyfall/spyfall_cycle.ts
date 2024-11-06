import { GameCycle } from "../common/game_cycle";
import { SpyFallCore } from "./spyfall_core";
import { SpyFallGameData } from "./spyfall_data";

export abstract class SpyFallCycle extends GameCycle
{
  game_data: SpyFallGameData;

  constructor(game_core: SpyFallCore, cycle_name: string)
  {
    super(game_core, cycle_name);

    this.game_data = game_core.getGameData() as SpyFallGameData;
  }

  getGameData(): SpyFallGameData
  {
    return this.game_data;
  }
}