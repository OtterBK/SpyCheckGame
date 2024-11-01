import { GameCore } from "../interfaces/game_core";
import { getLogger } from "../../utils/logger";
import { CycleType } from "../interfaces/game_cycle";
import { ClearRoundCycle, EndingCycle, ExpireCycle, LobbyCycle, PrepareRoundCycle, ProcessRoundCycle, StartCycle } from "./spycheck_cycles";
const logger = getLogger('SpyCheckCore');

export class SpyCheckCore extends GameCore
{
  constructor()
  {
    super();

    this.game_id = 'SpyCheck';
    this.game_name = '스파이체크';
  }

  start(): void 
  {
    if(!this.getGameSession())
    {
      logger.info(`Cannot start game ${this.game_id} core. game session is null`);
      return;
    }

    //initialize chain
    this.initializeCycle();
    this.doCycle(CycleType.LOBBY);
  }

  initializeCycle(): void
  {
    logger.info(`Initializing ${this.game_id} Chain`);

    const lobby = new LobbyCycle(this);
    const start = new StartCycle(this);
    const prepare_round = new PrepareRoundCycle(this);
    const process_round = new ProcessRoundCycle(this);
    const clear_round = new ClearRoundCycle(this);
    const ending = new EndingCycle(this);
    const expire = new ExpireCycle(this);

    lobby.setNextCycleType(CycleType.START);
    start.setNextCycleType(CycleType.PREPARE_ROUND);
    prepare_round.setNextCycleType(CycleType.PROCESS_ROUND);
    process_round.setNextCycleType(CycleType.CLEAR_ROUND);
    clear_round.setNextCycleType(CycleType.ENDING);
    ending.setNextCycleType(CycleType.EXPIRE);

    this.cycle_map.set(CycleType.LOBBY, lobby);
    this.cycle_map.set(CycleType.START, start);
    this.cycle_map.set(CycleType.PREPARE_ROUND, prepare_round);
    this.cycle_map.set(CycleType.PROCESS_ROUND, process_round);
    this.cycle_map.set(CycleType.CLEAR_ROUND, clear_round);
    this.cycle_map.set(CycleType.ENDING, ending);
    this.cycle_map.set(CycleType.EXPIRE, expire);
  }

}

