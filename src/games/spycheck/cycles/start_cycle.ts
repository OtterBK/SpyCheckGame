import { Interaction } from "discord.js";
import { GameUI } from "../../common/game_ui";
import { SPYCHECK_OPTION } from "../spycheck_options";
import { SpyCheckCore } from "../spycheck_core";
import { Question, SpyCheckCustomQuestionUI } from "../spycheck_data";
import { deleteMessage, sleep } from "../../../utils/utility";
import { getLogger } from "../../../utils/logger";
import { BGM_TYPE } from "../../../managers/bgm_manager";
import { SpyCheckCycle } from "../spycheck_cycle";
const logger = getLogger('SpyCheckStart');

export class StartCycle extends SpyCheckCycle
{
  constructor(game_core: SpyCheckCore)
  {
    super(game_core, `SpyCheckStart`);
  }

  async enter(): Promise<boolean>
  {
    return true;
  }

  async act(): Promise<boolean> 
  {
    const spy_choosing_alert_ui = new GameUI();
    spy_choosing_alert_ui.embed
      .setColor(0xD92334)
      .setTitle('스파이 선택 중...');

    this.getGameSession().sendUI(spy_choosing_alert_ui);

    await sleep(2000);
      
    //스파이 선정
    this.pickRandomSpy();

    await sleep(2000);

    //커스텀 질문 여부
    const custom_question_enabled = this.getGameCore().getGameOptions().getOption(SPYCHECK_OPTION.CUSTOM_QUESTION_ENABLE).getSelectedValueAsBoolean();
    if(custom_question_enabled)
    {
      await this.waitForCustomQuestion();
    }

    //남은 질문 세팅
    this.getGameData().shuffleQuestionList(); //섞고

    const spy_count = this.getGameCore().getGameOptions().getOption(SPYCHECK_OPTION.SPY_COUNT).getSelectedValueAsNumber();

    const deficit_count = (spy_count + 2) - this.getGameData().getQuestionList().length; //스파이 수 + 2개의 질문이 필요하다.
    if(deficit_count > 0) //부족하면 채우고 
    {
      this.getGameData().fillQuestionList(deficit_count);
    }
    else if(deficit_count < 0) //많으면 자르기
    {
      this.getGameData().discardQuestList(deficit_count);
    }

    return true;
  }

  async exit(): Promise<boolean>
  {
    return true;
  }

  onInteractionCreated(interaction: Interaction): void 
  {
    if(!interaction.isRepliable() || 
    (!interaction.isButton() && !interaction.isStringSelectMenu() && !interaction.isModalSubmit())
    )
    {
      return;
    }

    const id = interaction.customId;
    const user = interaction.user;
    const game_user = this.getGameData().findUser(user.id);

    if(!game_user)
    {
      return;
    }

    if(id === 'answer_type_select' && interaction.isStringSelectMenu())
    {
      const custom_question_ui = this.getGameData().getCustomQuestionUI(game_user);
      if(custom_question_ui)
      {
        custom_question_ui.selected_answer_type = parseInt(interaction.values[0]);
        interaction.deferReply();

        custom_question_ui.update();
        user.send(
          {
            content: `\`\`\`\🔸 답변 선택지를 변경했어요.\`\`\`\``,
            embeds: [custom_question_ui.embed],
            components: custom_question_ui.components
          });
      }
      return;
    }

    if(id === 'request_modal_write_question' && interaction.isButton())
    {
      const custom_question_ui = this.getGameData().getCustomQuestionUI(game_user);
      if(custom_question_ui)
      {
        interaction.showModal(custom_question_ui.write_question_modal);
      }
      return;
    }

    if(id === 'modal_submit_write_question' && interaction.isModalSubmit())
    {
      const custom_question_ui = this.getGameData().getCustomQuestionUI(game_user);
      if(custom_question_ui)
      {
        custom_question_ui.custom_question_text = interaction.fields.getTextInputValue('txt_custom_question');
        interaction.deferReply();
        
        deleteMessage(interaction.message);

        custom_question_ui.update();
        user.send(
        {
          content: `\`\`\`\🔸 작성이 완료됐다면 제출 버튼을 눌러주세요.\`\`\`\``,
          embeds: [custom_question_ui.embed],
          components: custom_question_ui.components,
        });
      }
    }

    if(id === 'submit' && interaction.isButton())
    {
      const custom_question_ui = this.getGameData().getCustomQuestionUI(game_user);
      if(custom_question_ui)
      {
        if(custom_question_ui.custom_question_text === '')
        {
          game_user.sendInteractionReply(interaction, { content: `\`\`\`🔸 먼저 질문부터 작성한 뒤 제출해주세요.\`\`\``, ephemeral: false });
          return;
        }

        if(custom_question_ui.confirmed)
        {
          game_user.sendInteractionReply(interaction, { content: `\`\`\`🔸 질문을 수정했어요.\`\`\``, ephemeral: false })
        }
        else
        {
          custom_question_ui.confirm();
          game_user.sendInteractionReply(interaction, { content: `\`\`\`🔸 질문을 제출했어요.\n🔸 제한 시간 내에 다시 제출을 눌러 질문을 수정할 수 있어요!\`\`\``, ephemeral: false });
        }
        
      }
      return;
    }
  }

  pickRandomSpy()
  {
    let spy_candidates = [];
    for(const participant of this.getGameData().getInGameUsers())
    {
      spy_candidates.push(participant);
    }

    const spy_alert_ui = new GameUI();
    spy_alert_ui.embed
    .setColor(0xD92334)
    .setTitle('🐱‍👤 **[ 스파이 ]**')
    .setDescription('🔸 당신은 스파이입니다.')
    .setFooter({text: '이 메시지는 당신에게만 보여요.'})

    const spy_count = this.getGameCore().getGameOptions().getOption(SPYCHECK_OPTION.SPY_COUNT).getSelectedValueAsNumber();
    for(let i = 0; i < spy_count && spy_candidates.length > 0; ++i)
    {
      const random_index = Math.floor(Math.random() * spy_candidates.length);
      const spy = spy_candidates.splice(random_index, 1)[0];
      this.getGameData().addSpy(spy);

    //   spy.sendDirectMessage(`\`\`\`🐱‍👤 당신은 스파이입니다.\`\`\``);
      spy.sendPrivateUI(spy_alert_ui);

    }
  }

  async waitForCustomQuestion()
  {
    const custom_question_time = this.getGameCore().getGameOptions().getOption(SPYCHECK_OPTION.CUSTOM_QUESTION_TIME).getSelectedValueAsNumber();

    this.getGameSession().playBGM(BGM_TYPE.PLING);

    for(const user of this.getGameData().getInGameUsers())
    {
      const custom_question_ui = new SpyCheckCustomQuestionUI();
      this.getGameData().registerCustomQuestionUI(user, custom_question_ui);

      user.sendPrivateUI(custom_question_ui);
    }

    await sleep(2000);

    const spy_choosing_alert_ui = new GameUI();
    spy_choosing_alert_ui.embed
      .setColor(0xFFD044)
      .setTitle('**📝 [ 질문 작성을 기다리는 중 ]**');

    this.getGameSession().playBGM(BGM_TYPE.GRAND_FATHER_11_MONTH);
    spy_choosing_alert_ui.startTimer(this.getGameSession(), '모두에게 질문 작성 화면을 보냈어요.\n \n스파이를 찾아내기 위해 사용할 질문을 작성해주세요.\n', custom_question_time * 1000);

    await sleep(custom_question_time * 1000);
    spy_choosing_alert_ui.stopTimer();

    for(const user of this.getGameData().getInGameUsers())
    {
      const question_ui = this.getGameData().getCustomQuestionUI(user);
      if(!question_ui || question_ui.confirmed === false || question_ui.custom_question_text === '')
      {
        continue;
      }

      const custom_question = new Question(question_ui.custom_question_text, question_ui.selected_answer_type);
      this.getGameData().addQuestion(custom_question);
    }

    const custom_question_list = this.getGameData().getQuestionList();
    const custom_question_size_alert = new GameUI();
    spy_choosing_alert_ui.embed
      .setColor(0xFFD044)
      .setTitle('**📝 [ 질문 작성 종료 ]**')
      .setDescription(`🔹 ${custom_question_list.length}개의 질문이 작성됐어요.\n🔹 부족하면 미리 준비된 질문으로 채울게요`)

    this.getGameSession().sendUI(custom_question_size_alert);
  }

}