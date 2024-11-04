import { LobbyCycleTemplate } from "../../common/game_cycle";
import { SpyCheckCore } from "../spycheck_core";
import { getLogger } from "../../../utils/logger";
const logger = getLogger('SpyCheckLobby');

export class LobbyCycle extends LobbyCycleTemplate
{
  constructor(game_core: SpyCheckCore)
  {
    super(game_core, `SpyCheckLobby`);

    this.setGameTitle('스파이체크');
    this.setGameThumbnail('https://github.com/user-attachments/assets/61599b61-fd5d-4c3b-8d3f-de276f0afda0');
  }

  getGameRuleDescription(): string 
  {
    return `
      ### 스파이체크 게임 룰

      ---

      #### 1. 게임 시작
      게임이 시작되면 참가자 중 **일정 인원**이 무작위로 **스파이**로 선정됩니다.

      #### 2. 질문 진행
      매 라운드마다 **모든 참가자에게 동일한 질문**이 주어집니다.

      #### 3. 스파이의 정보 제한
      스파이는 질문의 내용을 **알지 못합니다**.

      #### 4. 답변 공개
      정해진 시간이 지나면 **모든 참가자의 답변이 공개**됩니다.

      #### 5. 의심 인물 지목
      참가자들은 공개된 답변을 바탕으로 **가장 의심스러운 답변을 한 사람**을 지목합니다.

      #### 6. 스파이 여부 확인
      가장 많이 지목된 사람의 **역할이 공개**되며 탈락합니다.

      #### 7. 승리 조건
      - **시민팀**: **모든 스파이를 찾아내면 승리**합니다.
      - **스파이**: **(스파이 수 + 2)개의 라운드를 생존**하거나, **시민팀과 인원 수가 같거나 많아지면 승리**합니다.

      --- 
    `;
  }
}
