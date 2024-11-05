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
      **스파이체크 게임 룰**

      스파이체크는 플레이어들 사이에서 **스파이의 정체를 밝혀내거나, 스파이로서 시민을 속여 생존**을 목표로 하는 심리 추리 게임입니다.

      ---

      **1. 게임 시작**
      - 게임이 시작되면 참가자들 중에서 **무작위로 일정 인원이 스파이**로 선정됩니다.
      - 나머지 참가자는 **시민 역할**을 맡게 됩니다.

      ---

      **2. 질문 진행**
      - 매 라운드마다 **모든 참가자에게 동일한 질문**이 주어집니다.
      - 시민과 스파이 모두 질문에 대해 답해야 하지만, **스파이는 질문의 내용을 알지 못합니다**.

      ---

      **3. 스파이의 정보 제한**
      - **스파이는 질문에 대한 정보가 없으므로**, 즉흥적으로 대답해야 합니다.
      - 시민은 서로에게 **질문에 적합한 대답**을 하여 신뢰를 쌓고, 스파이를 색출해야 합니다.

      ---

      **4. 답변 공개**
      - **정해진 시간이 지나면**, 모든 참가자의 답변이 공개됩니다.
      - 각 참가자는 다른 사람들이 어떻게 대답했는지 볼 수 있습니다.

      ---

      **5. 의심 인물 지목**
      - 참가자들은 각자의 **추리를 바탕으로 가장 의심스러운 답변을 한 사람**을 지목합니다.
      - 공개된 답변을 분석하여 스파이로 의심되는 대상을 정합니다.

      ---

      **6. 스파이 여부 확인과 탈락**
      - **가장 많은 지목을 받은 사람은 탈락**하며, 해당 참가자의 **역할이 공개**됩니다.
      - 스파이라면 시민들에게 유리해지지만, 시민이라면 시민팀이 불리해집니다.

      ---

      **7. 승리 조건**

      - **시민팀의 승리**: 모든 스파이를 찾아내면 시민팀이 승리합니다.
      - **스파이의 승리**: 다음 조건 중 하나가 만족될 경우 스파이가 승리합니다.
        - (스파이 수 + 2)개의 라운드를 생존합니다.
        - **시민팀과 스파이의 인원 수가 같아지거나, 스파이 수가 많아질 때** 스파이가 승리합니다.

      ---
    `;
  }
}
