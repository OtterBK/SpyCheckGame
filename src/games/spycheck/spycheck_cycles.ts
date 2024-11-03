/** Cycle은 귀찮으니 한군데에 몰아서 작성 */

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, GuildMember, Interaction, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { CycleType, GameCycle, LobbyCycleTemplate } from "../common/game_cycle";
import { GameUI } from "../common/game_ui";
import { GameCore } from "../common/game_core";
import { SPYCHECK_OPTION } from "./spycheck_options";
import { SpyCheckCore } from "./spycheck_core";
import { Question, SpyCheckCustomQuestionUI, SpyCheckGameData } from "./spycheck_data";
import { GameData } from "../common/game_data";
import { cancelableSleep, deleteMessage, sleep } from "../../utils/utility";
import { GameSession } from "../common/game_session";
import { getLogger } from "../../utils/logger";
import { BGM_TYPE } from "../../managers/bgm_manager";
const logger = getLogger('SpyCheckCycle');

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
    return `# 게임 설명
    1. **게임 시작**: 게임이 시작되면 참가자 중 한 명이 무작위로 **스파이**로 선정됩니다.
    2. **질문 진행**: 매 라운드마다 **모든 참가자에게 동일한 질문**이 주어집니다.
    3. **스파이 정보 제한**: 단, **스파이는 질문의 내용을 모릅니다**.
    4. **답변 공개**: 정해진 시간이 지나면 **모든 참가자의 답변이 공개**됩니다.
    5. **의심 인물 지목**: 공개된 답변을 바탕으로 **가장 의심스러운 답변을 한 사람을 지목**합니다.
    6. **스파이 여부 확인**: 가장 많이 지목된 사람의 **역할이 공개**됩니다.
    7. **승리 조건**
      - **시민팀**: **모든 스파이를 찾아내면 승리**합니다.
      - **스파이**: **시민팀 인원 수만큼의 라운드를 생존하거나, 시민팀보다 인원 수가 많아지면 승리**합니다.
    `;
  }
}

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
      
    //스파이 선정
    this.pickRandomSpy();

    await sleep(3000);

    //커스텀 질문 여부
    const custom_question_enabled = this.getGameCore().getGameOptions().getOption(SPYCHECK_OPTION.CUSTOM_QUESTION_ENABLE).getSelectedValueAsBoolean();
    if(custom_question_enabled)
    {
      await this.waitForCustomQuestion();
    }

    //남은 질문 세팅
    const deficit_count = this.getGameData().getInGameUsers().length - this.getGameData().getQuestionList().length;
    if(deficit_count > 0) //부족하면 부족한 만큼 채우기
    {
      this.getGameData().fillQuestionList(deficit_count);
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
    if(id === 'answer_type_select' && interaction.isStringSelectMenu())
    {
      const custom_question_ui = this.getGameData().getCustomQuestionUI(user.id);
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
      const custom_question_ui = this.getGameData().getCustomQuestionUI(user.id);
      if(custom_question_ui)
      {
        interaction.showModal(custom_question_ui.write_question_modal);
      }
      return;
    }

    if(id === 'modal_submit_write_question' && interaction.isModalSubmit())
    {
      const custom_question_ui = this.getGameData().getCustomQuestionUI(user.id);
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
      const custom_question_ui = this.getGameData().getCustomQuestionUI(user.id);
      if(custom_question_ui)
      {
        if(custom_question_ui.custom_question_text === '')
        {
          interaction.reply({ content: `\`\`\`🔸 먼저 질문부터 작성한 뒤 제출해주세요.\`\`\``, ephemeral: false });
          return;
        }

        if(custom_question_ui.confirmed)
        {
          interaction.reply({ content: `\`\`\`🔸 질문을 수정했어요.\`\`\``, ephemeral: false })
        }
        else
        {
          custom_question_ui.confirm();
          interaction.reply({ content: `\`\`\`🔸 질문을 제출했어요.\n🔸 제한 시간 내에 다시 제출을 눌러 질문을 수정할 수 있어요!\`\`\``, ephemeral: false });
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

    const spy_count = this.getGameCore().getGameOptions().getOption(SPYCHECK_OPTION.SPY_COUNT).getSelectedValueAsNumber();
    for(let i = 0; i < spy_count && spy_candidates.length > 0; ++i)
    {
      const random_index = Math.floor(Math.random() * spy_candidates.length);
      const spy = spy_candidates.splice(random_index, 1)[0];
      this.getGameData().addSpy(spy);

      spy.send({
        content: `\`\`\`🐱‍👤 당신은 스파이입니다.\`\`\``
      });
    }
  }

  async waitForCustomQuestion()
  {
    const custom_question_time = this.getGameCore().getGameOptions().getOption(SPYCHECK_OPTION.CUSTOM_QUESTION_TIME).getSelectedValueAsNumber();

    this.getGameSession().playBGM(BGM_TYPE.PLING);

    const spy_choosing_alert_ui = new GameUI();
    spy_choosing_alert_ui.embed
      .setColor(0xFFD044)
      .setTitle('**📝 [ 질문 작성을 기다리는 중 ]**');

    this.getGameSession().playBGM(BGM_TYPE.GRAND_FATHER_11_MONTH);
    spy_choosing_alert_ui.startTimer(this.getGameSession(), '모두에게 질문 작성 화면을 보냈어요.\n \n스파이를 찾아내기 위해 사용할 질문을 작성해주세요.\n', custom_question_time * 1000);

    for(const user of this.getGameData().getInGameUsers())
    {
      const custom_question_ui = new SpyCheckCustomQuestionUI();
      this.getGameData().registerCustomQuestionUI(user.id, custom_question_ui);

      user.send(
      {
        embeds: [custom_question_ui.embed],
        components: custom_question_ui.components
      });
    }

    await sleep(custom_question_time * 1000);
    spy_choosing_alert_ui.stopTimer();

    for(const user of this.getGameData().getInGameUsers())
    {
      const question_ui = this.getGameData().getCustomQuestionUI(user.id);
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

export class ProcessRoundCycle extends SpyCheckCycle
{
  private current_question: Question | null = null;
  private answer_timer_canceler: () => void = () => {};
  private vote_timer_canceler:  () => void = () => {};

  private step = 0;

  constructor(game_core: SpyCheckCore)
  {
    super(game_core, `SpyCheckProcessRound`);
  }

  async enter(): Promise<boolean>
  {
    this.current_question = null;
    this.step = 0;
    this.answer_timer_canceler = () => {};
    this.vote_timer_canceler = () => {};

    this.current_question = this.getGameData().getCurrentQuestion();
    if(!this.current_question)
    {
      logger.error(`current question is null. stop process round`);
      return false;
    }

    return true;
  }

  async act(): Promise<boolean> 
  {
    if(!this.current_question)
    {
      return false;
    }

    const answer_select_time = this.getGameCore().getGameOptions().getOption(SPYCHECK_OPTION.ANSWER_SELECT_TIME).getSelectedValueAsNumber();

    const answer_select_alert_ui = new GameUI();
   answer_select_alert_ui.embed
      .setColor(0xFFD044)
      .setTitle('**📝 [ 답변 선택을 기다리는 중 ]**');

      this.getGameSession().playBGM(BGM_TYPE.GRAND_FATHER_11_MONTH);
   answer_select_alert_ui.startTimer(this.getGameSession(), '개인메시지로 모두에게 질문지를 보냈어요.\n \n질문에 대한 적절한 답변을 선택해주세요!\n', answer_select_time * 1000);

    for(const user of this.getGameData().getInGameUsers())
    {
      const answer_select_ui = new GameUI();
      answer_select_ui.embed
      .setColor(0xFFD044)
      .setTitle('❓ **[ 답변 선택 ]**')
      .setDescription(`
        🔹 질문:\n \n${this.current_question?.question_text}
      `)
      .setFooter({text: '스파이는 질문 내용이 보이지 않아요'});

      const answer_select_comp = this.getGameData().getAnswerSelectComponent(this.current_question ? this.current_question.answer_type : 0, this.getGameData().getInGameUsers());
      if(answer_select_comp)
      {
        answer_select_ui.components.push(answer_select_comp);
      }

      if(this.getGameData().isSpy(user.id))
      {
        answer_select_ui.embed
        .setDescription(`🔹 질문: **[스파이는 질문 내용을 볼 수 없어요.]**`)
        .setFooter({text: '아무 답변이나 선택하세요.'})
      }

      user.send(
      {
        embeds: [answer_select_ui.embed],
        components: answer_select_ui.components
      });
    }

    const [answer_timer, answer_timer_cancel] = cancelableSleep(answer_select_time * 1000);
    this.answer_timer_canceler = answer_timer_cancel;
    await answer_timer;

    answer_select_alert_ui.stopTimer();
    
    const answer_show_ui = new GameUI();
    answer_show_ui.embed
    .setColor(0xFFD044)
    .setTitle('📝 **[ 답변 공개 ]**')
    .setDescription(`
      🔹 질문:\n${this.current_question.question_text}\n
    `)

    const answer_select_map = this.getGameData().getAnswerSelectMap();
    for(const user of this.getGameData().getInGameUsers())
    {
      let selected_answer_value = answer_select_map.get(user.id);
      if(!selected_answer_value)
      {
        user.send(`\`\`\`🔸 답변을 선택하지 않으셔서 무작위로 선택됐어요.\`\`\``)
        selected_answer_value = this.getGameData().getRandomAnswer(this.current_question.answer_type, this.getGameData().getInGameUsers()) ?? 'ERROR';
      }

      answer_show_ui.embed.addFields(
        {
          name: user.displayName,
          value: selected_answer_value,
          inline: false,
        },
      )
    }

    this.getGameSession().sendUI(answer_show_ui);

    const vote_ui = new GameUI();
    vote_ui.embed
    .setColor(0x004AAD)
    .setTitle('📩 **[ 투표 ]**')
    .setFooter({text: '투표는 익명으로 진행돼요.'});

    const vote_component = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
      .setCustomId('vote')
      .setPlaceholder(`의심스러운 플레이어 지목하기`)
      .addOptions(
        this.getGameData().getInGameUsers().map(user => {
          return new StringSelectMenuOptionBuilder().setLabel(user.displayName).setValue(user.id)
        })
      )
    )

    const vote_skip_component = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
      .setCustomId('vote_skip')
      .setLabel('투표 스킵')
      .setStyle(ButtonStyle.Danger)
    )

    vote_ui.components.push(vote_component, vote_skip_component);

    this.getGameSession().playBGM(BGM_TYPE.PLING);
    const spy_guess_time = this.getGameCore().getGameOptions().getOption(SPYCHECK_OPTION.SPY_GUESS_TIME).getSelectedValueAsNumber();
    vote_ui.startTimer(this.getGameSession(), '🔹 의심스러운 답변을 선택한 플레이어를 지목해주세요.\n', spy_guess_time * 1000);

    this.step = 1;

    const [vote_timer, vote_timer_cancel] = cancelableSleep(spy_guess_time * 1000);
    this.vote_timer_canceler = vote_timer_cancel;
    await vote_timer;

    vote_ui.stopTimer();

    this.step = 2;

    const vote_show_ui = new GameUI();
    vote_show_ui.embed
    .setColor(0x004AAD)
    .setTitle('📝 **[ 투표 결과 공개 ]**')
    .setDescription(`🔹 투표 결과:\n`)

    let most_voted_users: Array<GuildMember> = [];
    let most_voted_count = 0;
    for(const user of this.getGameData().getInGameUsers())
    {
      const voted_count = this.getGameData().getVotedCount(user.id);
      if(voted_count === 0)
      {
        continue;
      }

      if(voted_count >= most_voted_count)
      {
        if(voted_count === most_voted_count)
        {
          most_voted_users.push(user);
        }
        else //중복 아냐?
        {
          most_voted_users = [ user ]; //그럼 1명만으로 다시 등록
        }

        most_voted_count = voted_count;
      }

      vote_show_ui.embed.addFields(
        {
          name: user.displayName,
          value: `${voted_count}표`,
          inline: false,
        },
      )
    }

    this.getGameSession().sendUI(vote_show_ui);

    await sleep(3000);

    this.getGameSession().playBGM(BGM_TYPE.PLING);
    const vote_result_ui = new GameUI();
    vote_result_ui.embed
    .setColor(0x004ADD)
    .setTitle('🔎 **[ 결과 ]**')

    if(most_voted_users.length !== 1) //동 투표거나 아예 무투표
    {
      vote_result_ui.embed
      .setDescription('🔹 최다 득표를 받은 플레이어가 없어서 다음 라운드로 진행합니다.');

      this.getGameSession().sendUI(vote_result_ui);
      return true;
    }
    else
    {
      vote_result_ui.embed
      .setDescription(`🔹 최다 득표:\n${most_voted_users.map(user => user.displayName + '\n')}`);
    }

    await sleep(4000);

    const spy_guessed_user = most_voted_users[0];

    const spy_killing_ui = new GameUI();
    spy_killing_ui.embed
    .setColor(0xD92334)
    .setTitle('☠ **[ 스파이 검사 중 ]**')
    .setDescription(`🔹 ${spy_guessed_user.displayName} 님을 심문하는 중이에요.`)

    this.getGameSession().sendUI(spy_killing_ui);

    this.getGameSession().playBGM(BGM_TYPE.PUNCH);

    await sleep(3000);

    const spy_result_ui = new GameUI();

    if(this.getGameData().isSpy(spy_guessed_user.id))
    {
      spy_result_ui.embed
      .setColor(0xD92334)
      .setTitle('👻 **[ 스파이!!! ]**')
      .setDescription(`🔹 ${spy_guessed_user.displayName} 님은 스파이였습니다!`)
      this.getGameSession().playBGM(BGM_TYPE.GUN_SHOT);
    }
    else
    {
      spy_result_ui.embed
      .setColor(0x004AAD)
      .setTitle('😇 **[ 무고한 시민 ]**')
      .setDescription(`🔹 ${spy_guessed_user.displayName} 님은 스파이가 아니었습니다!`)
      this.getGameSession().playBGM(BGM_TYPE.ERROR);
    }

    this.getGameSession().sendUI(spy_result_ui);
    this.getGameData().removeInGameUser(spy_guessed_user.id);

    await sleep(3500);
  
    return true;
  }

  async exit(): Promise<boolean>
  {
    return true;
  }

  onInteractionCreated(interaction: Interaction): void 
  {
    if(interaction.isStringSelectMenu() && interaction.customId === 'answer_select' && this.step === 0) //답변 선택함
    {
      const selected_value = interaction.values[0];
      const select_map_size = this.getGameData().addUserAnswerSelect(interaction.user.id, selected_value);

      if(select_map_size === this.getGameData().getInGameUsers().length
        && this.answer_timer_canceler) //모두 선택했으면 바로 skip
      {
        this.answer_timer_canceler(); //타이머 중지
        this.getGameSession().sendMessage(`\`\`\`🔸 모든 플레이어가 답변을 선택했어요.\`\`\``)
        this.getGameSession().playBGM(BGM_TYPE.CHAT);
      }

      interaction.reply({
        content: `\`\`\`🔸 선택한 답변: ${selected_value}\`\`\``,
        ephemeral: true
      })
  
      return;
    }

    if(this.step === 1 &&
      (interaction.isStringSelectMenu() && interaction.customId === 'vote') || 
      (interaction.isButton() && interaction.customId === 'vote_skip')) //투표함
    {
      const selected_value = (interaction.isStringSelectMenu() && interaction.customId === 'vote') ? interaction.values[0] : '무투표';
      const select_map_size = this.getGameData().addUserVoted(interaction.user.id, selected_value);

      if(select_map_size === this.getGameData().getInGameUsers().length
        && this.vote_timer_canceler) //모두 선택했으면 바로 skip
      {
        this.vote_timer_canceler(); //타이머 중지
        this.getGameSession().sendMessage(`\`\`\`🔸 모든 플레이어가 투표했어요.\`\`\``)
        this.getGameSession().playBGM(BGM_TYPE.CHAT);
      }

      if(interaction.customId === 'vote')
      {
        interaction.reply({
          content: `\`\`\`🔸 선택한 플레이어: ${this.getGameData().getDisplayName(selected_value) ?? selected_value}\`\`\``,
          ephemeral: true
        })
      }
      else
      {
        interaction.reply({
          content: `\`\`\`🔸 투표를 스킵했어요.\`\`\``,
          ephemeral: true
        })
      }
  
      return;
    }
  }

}

export class ClearRoundCycle extends SpyCheckCycle
{
  private spy_win = false;
  private spy_lose = false;

  constructor(game_core: SpyCheckCore)
  {
    super(game_core, `SpyCheckClearRound`);
  }

  async enter(): Promise<boolean>
  {
    let spy_count = 0;
    for(const user of this.getGameData().getInGameUsers())
    {
      if(this.getGameData().isSpy(user.id))
      {
        ++spy_count;
      }
    }

    if(spy_count === 0) //스파이가 이제 없다면
    {
      this.spy_lose = true;
      this.getGameData().setGameResult('SPY_LOSE');

      const reason_ui = new GameUI();
      reason_ui.embed
      .setColor(0x004AAD)
      .setTitle('🏁 **[ 게임 종료 ]**')
      .setDescription('🔹 스파이를 모두 찾아냈습니다.')

      this.getGameSession().sendUI(reason_ui);

      this.getGameSession().playBGM(BGM_TYPE.SCORE_ALARM);
    }
    else if(spy_count > this.getGameData().getInGameUsers().length / 2) //스파이가 과반수 이상이면
    {
      this.spy_win = true; 
      this.getGameData().setGameResult('SPY_WIN');

      const reason_ui = new GameUI();
      reason_ui.embed
      .setColor(0xD92334)
      .setTitle('🏁 **[ 게임 종료 ]**')
      .setDescription('🔹 스파이가 과반수 이상입니다.')

      this.getGameSession().sendUI(reason_ui);
      this.getGameSession().playBGM(BGM_TYPE.PLING);
    }
    else if(this.getGameData().getQuestionList().length === 0) //낼 질문이 없다면
    {
      this.spy_win = true; 
      this.getGameData().setGameResult('SPY_WIN');

      const reason_ui = new GameUI();
      reason_ui.embed
      .setColor(0xD92334)
      .setTitle('🏁 **[ 게임 종료 ]**')
      .setDescription('🔹 더 이상 낼 질문이 없습니다.\n🔹 스파이가 모든 질문을 버텨냈습니다.')

      this.getGameSession().sendUI(reason_ui);
      this.getGameSession().playBGM(BGM_TYPE.PLING);
    }

    await sleep(3000);

    return true;
  }

  async act(): Promise<boolean> 
  {
    if(this.getGameData().getGameResult() === 'NULL') //게임 아직 안끝났다면
    {
      this.setNextCycleType(CycleType.PREPARE_ROUND); //다시 라운드 진행
      return true;
    }

    //끝났다?
    this.setNextCycleType(CycleType.ENDING);
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

export class EndingCycle extends SpyCheckCycle
{
  constructor(game_core: SpyCheckCore)
  {
    super(game_core, `SpyCheckEnding`);
  }

  async enter(): Promise<boolean>
  {
    return true;
  }
  async act(): Promise<boolean> 
  {
    const game_result = this.getGameData().getGameResult();
    if(game_result === 'NULL')
    {
      logger.error("No Game Result in ending cycle")
      return false;
    }

    const spy_win = game_result === 'SPY_WIN' ? true : false;

    const spy_list = this.getGameData().getSpyListString();

    const ending_ui = new GameUI();
    ending_ui.embed
    .setColor(0x009900)
    .setTitle('결과')
    .setDescription(`🐱‍👤 스파이 명단:\n${spy_list}`)

    if(spy_win)
    {
      ending_ui.embed
      .setTitle('🐱‍👤 **[ 스파이팀 승리! ]**')
    }
    else
    {
      ending_ui.embed
      .setTitle('🤠 **[ 시민팀 승리! ]**')
    }

    this.getGameSession().playBGM(BGM_TYPE.FINISH);
    this.getGameSession().sendUI(ending_ui);
    await sleep(3000);

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

export class ExpireCycle extends SpyCheckCycle
{
  constructor(game_core: SpyCheckCore)
  {
    super(game_core, `SpyCheckExipre`);
  }

  async enter(): Promise<boolean>
  {
    return true;
  }
  async act(): Promise<boolean> 
  {
    this.getGameSession().expire();
    this.getGameData().expire();
    this.getGameCore().expire();
    return true;
  }
  async exit(): Promise<boolean>
  {
    return false;
  }

  onInteractionCreated(interaction: Interaction): void 
  {
        
  }


}