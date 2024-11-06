import { GameCore } from "../common/game_core";
import { getLogger } from "../../utils/logger";
import { CycleType } from "../common/game_cycle";
import { GameOption, OptionChoice } from "../common/game_options";
import { SpyFallGameData } from "./spyfall_data";
import { ClearRoundCycle } from "./cycles/clear_round_cycle";
import { EndingCycle } from "./cycles/ending_cycle";
import { ExpireCycle } from "./cycles/expire_cycle";
import { LobbyCycle } from "./cycles/lobby_cycle";
import { PrepareRoundCycle } from "./cycles/prepare_round_cycle";
import { ProcessRoundCycle } from "./cycles/process_round_cycle";
import { StartCycle } from "./cycles/start_cycle";
import { GameInfo } from "../common/game_info";
import { SPYFALL_OPTION } from "./spyfall_options";
const logger = getLogger('SpyFallCore');

export class SpyFallCore extends GameCore
{
  constructor(game_info: GameInfo)
  {
    super(game_info);

    this.game_data = new SpyFallGameData();
  }

  start(): void 
  {
    if(!this.getGameSession())
    {
      logger.error(`Cannot start game ${this.game_id} core. game session is null`);
      return;
    }
    
    logger.error(`start ${this.game_id} from game core`);

    this.initializeGameOptions();
    this.initializeCycle(); //initialize chain
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

  initializeGameOptions()
  {
    this.game_options.addOption(
      new GameOption('확장 모드 사용 여부', SPYFALL_OPTION.EXTEND_MODE_ENABLE, '기존 25개의 장소에 추가로 25개의 장소를 추가합니다.')
      .addChoice(new OptionChoice('끄기', 'false', '25개의 장소만 사용합니다.'))
      .addChoice(new OptionChoice('켜기', 'true', '25개의 장소를 추가하여 총 50개의 장소를 사용합니다.'))
      .selectChoice('false')
    );

    this.game_options.addOption(
      new GameOption('토론 시간', SPYFALL_OPTION.SPY_GUESS_TIME, '스파이가 누구인지 추측할 토론 시간을 설정합니다.')
        .addChoice(new OptionChoice('30초', '300', '스파이 색출을 위한 토론 시간을 5분 제공합니다.'))
        .addChoice(new OptionChoice('40초', '360', '스파이 색출을 위한 토론 시간을 6분 제공합니다.'))
        .addChoice(new OptionChoice('50초', '420', '스파이 색출을 위한 토론 시간을 7분 제공합니다.'))
        .addChoice(new OptionChoice('60초', '480', '스파이 색출을 위한 토론 시간을 8분 제공합니다.'))
        .addChoice(new OptionChoice('70초', '540', '스파이 색출을 위한 토론 시간을 9분 제공합니다.'))
        .addChoice(new OptionChoice('80초', '600', '스파이 색출을 위한 토론 시간을 10분 제공합니다.'))
        .addChoice(new OptionChoice('90초', '660', '스파이 색출을 위한 토론 시간을 11분 제공합니다.'))
        .addChoice(new OptionChoice('100초', '720', '스파이 색출을 위한 토론 시간을 12분 제공합니다.'))
        .addChoice(new OptionChoice('110초', '780', '스파이 색출을 위한 토론 시간을 13분 제공합니다.'))
        .addChoice(new OptionChoice('120초', '840', '스파이 색출을 위한 토론 시간을 14분 제공합니다.'))
        .addChoice(new OptionChoice('120초', '900', '스파이 색출을 위한 토론 시간을 15분 제공합니다.'))
        .selectChoice('600')
    );

    this.game_options.addOption(
      new GameOption('스파이 수', SPYFALL_OPTION.SPY_COUNT, '게임에서 사용할 스파이의 수를 설정합니다.')
        .addChoice(new OptionChoice('1명', '1', '스파이 수를 1명으로 설정합니다.'))
        .addChoice(new OptionChoice('2명', '2', '스파이 수를 2명으로 설정합니다.'))
        .selectChoice('1')
    );
  }

}

