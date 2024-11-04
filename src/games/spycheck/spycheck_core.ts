import { GameCore } from "../common/game_core";
import { getLogger } from "../../utils/logger";
import { CycleType } from "../common/game_cycle";
import { GameOption, OptionChoice } from "../common/game_options";
import { SpyCheckGameData } from "./spycheck_data";
import { SPYCHECK_OPTION } from "./spycheck_options";
import { ClearRoundCycle } from "./cycles/clear_round_cycle";
import { EndingCycle } from "./cycles/ending_cycle";
import { ExpireCycle } from "./cycles/expire_cycle";
import { LobbyCycle } from "./cycles/lobby_cycle";
import { PrepareRoundCycle } from "./cycles/prepare_round_cycle";
import { ProcessRoundCycle } from "./cycles/process_round_cycle";
import { StartCycle } from "./cycles/start_cycle";
const logger = getLogger('SpyCheckCore');

export class SpyCheckCore extends GameCore
{
  constructor()
  {
    super();

    this.game_id = 'SPYCHECK';
    this.game_name = '스파이체크';

    this.min_players = 4;
    this.max_players = 9;

    this.game_data = new SpyCheckGameData();
  }

  start(): void 
  {
    if(!this.getGameSession())
    {
      logger.info(`Cannot start game ${this.game_id} core. game session is null`);
      return;
    }

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
      new GameOption('직접 질문 작성하기 여부', SPYCHECK_OPTION.CUSTOM_QUESTION_ENABLE, '참가자가 직접 질문을 작성할 수 있게 허용합니다.')
      .addChoice(new OptionChoice('끄기', 'false', '게임에서 미리 마련된 질문만 사용합니다.'))
      .addChoice(new OptionChoice('켜기', 'true', '참가자가 직접 질문을 작성할 수 있습니다.'))
      .selectChoice('false')
    );

    this.game_options.addOption(
      new GameOption('직접 질문 작성 시간', SPYCHECK_OPTION.CUSTOM_QUESTION_TIME, '참가자가 직접 질문을 작성할 수 있는 시간을 설정합니다.')
        .addChoice(new OptionChoice('30초', '30', '질문 작성 시간을 30초 제공합니다.'))
        .addChoice(new OptionChoice('40초', '40', '질문 작성 시간을 40초 제공합니다.'))
        .addChoice(new OptionChoice('50초', '50', '질문 작성 시간을 50초 제공합니다.'))
        .addChoice(new OptionChoice('60초', '60', '질문 작성 시간을 60초 제공합니다.'))
        .addChoice(new OptionChoice('70초', '70', '질문 작성 시간을 70초 제공합니다.'))
        .addChoice(new OptionChoice('80초', '80', '질문 작성 시간을 80초 제공합니다.'))
        .addChoice(new OptionChoice('90초', '90', '질문 작성 시간을 90초 제공합니다.'))
        .selectChoice('60')
    );

    this.game_options.addOption(
      new GameOption('답변 선택 시간', SPYCHECK_OPTION.ANSWER_SELECT_TIME, '질문에 대한 답변을 선택할 시간을 설정합니다.')
        .addChoice(new OptionChoice('10초', '10', '질문에 대한 답변 선택 시간을 20초 제공합니다.'))
        .addChoice(new OptionChoice('20초', '20', '질문에 대한 답변 선택 시간을 20초 제공합니다.'))
        .addChoice(new OptionChoice('30초', '30', '질문에 대한 답변 선택 시간을 30초 제공합니다.'))
        .addChoice(new OptionChoice('40초', '40', '질문에 대한 답변 선택 시간을 40초 제공합니다.'))
        .addChoice(new OptionChoice('50초', '50', '질문에 대한 답변 선택 시간을 50초 제공합니다.'))
        .addChoice(new OptionChoice('60초', '60', '질문에 대한 답변 선택 시간을 60초 제공합니다.'))
        .selectChoice('30')
    );

    this.game_options.addOption(
      new GameOption('토론 시간', SPYCHECK_OPTION.SPY_GUESS_TIME, '스파이가 누구인지 추측할 토론 시간을 설정합니다.')
        .addChoice(new OptionChoice('30초', '30', '스파이 추측을 위한 토론 시간을 30초 제공합니다.'))
        .addChoice(new OptionChoice('40초', '40', '스파이 추측을 위한 토론 시간을 40초 제공합니다.'))
        .addChoice(new OptionChoice('50초', '50', '스파이 추측을 위한 토론 시간을 50초 제공합니다.'))
        .addChoice(new OptionChoice('60초', '60', '스파이 추측을 위한 토론 시간을 60초 제공합니다.'))
        .addChoice(new OptionChoice('70초', '70', '스파이 추측을 위한 토론 시간을 70초 제공합니다.'))
        .addChoice(new OptionChoice('80초', '80', '스파이 추측을 위한 토론 시간을 80초 제공합니다.'))
        .addChoice(new OptionChoice('90초', '90', '스파이 추측을 위한 토론 시간을 90초 제공합니다.'))
        .addChoice(new OptionChoice('100초', '100', '스파이 추측을 위한 토론 시간을 100초 제공합니다.'))
        .addChoice(new OptionChoice('110초', '110', '스파이 추측을 위한 토론 시간을 110초 제공합니다.'))
        .addChoice(new OptionChoice('120초', '120', '스파이 추측을 위한 토론 시간을 120초 제공합니다.'))
        .selectChoice('70')
    );

    this.game_options.addOption(
      new GameOption('스파이 수', SPYCHECK_OPTION.SPY_COUNT, '게임에서 사용할 스파이의 인원 수를 설정합니다.')
        .addChoice(new OptionChoice('1명', '1', '스파이 수를 1명으로 설정합니다.'))
        .addChoice(new OptionChoice('2명', '2', '스파이 수를 2명으로 설정합니다.'))
        .addChoice(new OptionChoice('3명', '3', '스파이 수를 3명으로 설정합니다.'))
        .selectChoice('1')
    );
  }

}

