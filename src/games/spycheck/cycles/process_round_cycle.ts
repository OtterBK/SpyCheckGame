import { ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildMember, Interaction, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { GameUI } from "../../common/game_ui";
import { SPYCHECK_OPTION } from "../spycheck_options";
import { SpyCheckCore } from "../spycheck_core";
import { Question } from "../spycheck_data";
import { cancelableSleep, sleep } from "../../../utils/utility";
import { getLogger } from "../../../utils/logger";
import { BGM_TYPE } from "../../../managers/bgm_manager";
import { SpyCheckCycle } from "../spycheck_cycle";
import { GameUser } from "../../common/game_user";
const logger = getLogger('SpyCheckProcessRound');

enum ROUND_STEP
{
  NONE,
  ANSWER_SELECTION,
  SHOW_ANSWERS,
  VOTE_TIME,
  SHOW_VOTE_RESULT,
  SPY_GUESS,
}

export class ProcessRoundCycle extends SpyCheckCycle
{
  private round_num: number = 0;

  private current_question: Question | null = null;
  private round_step: ROUND_STEP = ROUND_STEP.NONE;
  private most_voted_users: Array<GameUser> = [];
  private answer_timer_canceler: () => number = () => 0;
  private vote_timer_canceler:  () => number = () => 0;

  constructor(game_core: SpyCheckCore)
  {
    super(game_core, `SpyCheckProcessRound`);
  }

  async enter(): Promise<boolean>
  {
    this.resetRound();

    this.current_question = this.getGameData().getCurrentQuestion();
    if(!this.current_question)
    {
      this.getGameSession().sendMessage(`\`\`\`🔸 제출할 질문이 없습니다. 게임에 강제종료됩니다. (나타날 수가 없는 버그인데...)\`\`\``)
      this.getGameSession().forceStop(`current question is null. stop process round`);
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

    await this.answerSelectionStep(); //답변 선택 시간
    
    await this.displayAnswerStep(); //선택한 답변 공개

    await this.voteStep(); //의심스러운 플레이어 투표 시간

    await this.showVoteResultStep(); //투표 결과 공개

    await this.spyGuess(); //스파이 심문

  
    return true;
  }

  async exit(): Promise<boolean>
  {
    return true;
  }

  onInteractionCreated(interaction: Interaction): void 
  {
    const game_user = this.getGameData().findUser(interaction.user.id);
    if(!game_user)
    {
      return;
    }

    if(this.checkAnswerSelectionEvent(game_user, interaction))
    {
      return;
    }
   
    if(this.checkVoteEvent(game_user, interaction))
    {
      return;
    }
    
  }

  private checkAnswerSelectionEvent(game_user: GameUser, interaction: Interaction): boolean
  {
    if(!interaction.isStringSelectMenu()
     || interaction.customId !== 'answer_select' 
     || this.round_step !== ROUND_STEP.ANSWER_SELECTION) //답변 선택함
    {
      return false;
    }
     
    const selected_answer = interaction.values[0];
    const select_map_size = this.getGameData().addUserAnswerSelect(game_user, selected_answer);

    game_user.sendInteractionReply(interaction, {
      content: `\`\`\`🔸 선택한 답변: ${this.getGameData().getDisplayName(selected_answer) ?? selected_answer}\`\`\``,
      ephemeral: true
    })

    if(select_map_size === this.getGameData().getInGameUserCount()
      && this.answer_timer_canceler) //모두 선택했으면 바로 skip
    {
      this.answer_timer_canceler(); //타이머 중지
      this.getGameSession().sendMessage(`\`\`\`🔸 모든 플레이어가 답변을 선택했어요.\`\`\``)
      this.getGameSession().playBGM(BGM_TYPE.CHAT);
    }

    return true;
  }

  private checkVoteEvent(game_user: GameUser, interaction: Interaction): boolean
  {
    if(!interaction.isStringSelectMenu() && !interaction.isButton())
    {
      return false;
    }

    if(interaction.customId !== 'vote' && interaction.customId !== 'vote_skip') //투표는 둘 중 하나
    {
      return false;
    }

    const selected_user_id = (interaction.isStringSelectMenu() && interaction.customId === 'vote') ? interaction.values[0] : '무투표';
    const select_map_size = this.getGameData().addUserVoted(game_user, selected_user_id);

    if(interaction.customId === 'vote')
    {
      game_user.sendInteractionReply(interaction, {
        content: `\`\`\`${interaction.customId === 'vote' ?
          `🔸 선택한 플레이어: ${this.getGameData().getDisplayName(selected_user_id) ?? selected_user_id}`
          : `🔸 투표를 스킵했어요.`
        }\`\`\``,
        ephemeral: true
      })
    }

    if(select_map_size === this.getGameData().getInGameUserCount()
      && this.vote_timer_canceler) //모두 선택했으면 바로 skip
    {
      this.vote_timer_canceler(); //타이머 중지
      this.getGameSession().sendMessage(`\`\`\`🔸 모든 플레이어가 투표했어요.\`\`\``)
      this.getGameSession().playBGM(BGM_TYPE.CHAT);
    }

    return true;
  }

  private resetRound()
  {
    this.current_question = null;
    this.round_step = ROUND_STEP.NONE;
    this.most_voted_users = [];
    this.answer_timer_canceler = () => 0;
    this.vote_timer_canceler = () => 0;
  }

  private async answerSelectionStep()
  {
    this.round_step = ROUND_STEP.ANSWER_SELECTION;

    const answer_select_time = this.getOption(SPYCHECK_OPTION.ANSWER_SELECT_TIME).getSelectedValueAsNumber();

    for(const user of this.getGameData().getInGameUsers())
    {
      const is_spy = this.getGameData().isSpy(user);
      const answer_select_ui = new GameUI();

      answer_select_ui.embed
      .setColor(0xFFD044)
      .setTitle('❓ **[ 답변 선택 ]**')
      .setDescription(
        is_spy ? 
        `\n🔹 질문: **[스파이는 질문 내용을 볼 수 없어요.]**\n`
        : `\n🔹 질문:\n \n${this.current_question?.question_text}\n`)
      .setFooter({text: 
        is_spy ?
        '아무 답변이나 선택하세요.'
        : '스파이는 질문 내용이 보이지 않아요'
      });

      const answer_select_comp = this.getGameData().getAnswerSelectComponent(this.current_question ? this.current_question.answer_type : 0, this.getGameData().getInGameUsers());
      if(answer_select_comp)
      {
        answer_select_ui.components.push(answer_select_comp);
      }

      user.sendPrivateUI(answer_select_ui);
    }

    await sleep(2000);

    const answer_select_alert_ui = new GameUI();
    answer_select_alert_ui.embed
      .setColor(0xFFD044)
      .setTitle('**📝 [ 답변 선택을 기다리는 중 ]**')
      .setFooter({text: `${++this.round_num}번째 라운드에요.`});

    this.getGameSession().playBGM(BGM_TYPE.GRAND_FATHER_11_MONTH);
    answer_select_alert_ui.startTimer(this.getGameSession(), '모두에게 질문지를 보냈어요.\n \n질문에 대한 적절한 답변을 선택해주세요!\n', answer_select_time );

    const [answer_timer, answer_timer_cancel] = cancelableSleep(answer_select_time * 1000);
    this.answer_timer_canceler = answer_timer_cancel;
    await answer_timer;

    answer_select_alert_ui.stopTimer();
  }

  private async displayAnswerStep()
  {
    this.round_step = ROUND_STEP.SHOW_ANSWERS;

    const answer_show_ui = new GameUI();
    answer_show_ui.embed
    .setColor(0xFFD044)
    .setTitle('📝 **[ 답변 공개 ]**')
    .setDescription(`
      🔹 질문:\n${this.current_question!.question_text}\n
    `)

    for(const user of this.getGameData().getInGameUsers())
    {
      let selected_answer_value = this.getGameData().getAnswerSelectedValue(user);
      if(!selected_answer_value)
      {
        user.sendPrivateMessage(`\`\`\`🔸 답변을 선택하지 않으셔서 무작위로 선택됐어요.\`\`\``);
        selected_answer_value = this.getGameData().getRandomAnswer(this.current_question!.answer_type, this.getGameData().getInGameUsers()) ?? 'ERROR';
      }

      answer_show_ui.embed.addFields(
        {
          name: user.getDisplayName(),
          value: this.getGameData().getDisplayName(selected_answer_value) ?? selected_answer_value,
          inline: false,
        },
      )
    }

    this.getGameSession().sendUI(answer_show_ui);
  }

  private async voteStep()
  {
    this.round_step = ROUND_STEP.VOTE_TIME;

    const vote_ui = new GameUI();
    vote_ui.embed
    .setColor(0x004AAD)
    .setTitle('📩 **[ 투표 ]**')
    .setFooter({text: '투표는 익명으로 진행돼요.'});

    const vote_component = this.getGameData().getUserSelectComponents('vote', `의심스러운 플레이어 지목하기`);
    const vote_skip_component = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
      .setCustomId('vote_skip')
      .setLabel('투표 스킵')
      .setStyle(ButtonStyle.Danger)
    )
    vote_ui.components.push(vote_component, vote_skip_component);

    this.getGameSession().playBGM(BGM_TYPE.PLING);
    const spy_guess_time = this.getOption(SPYCHECK_OPTION.SPY_GUESS_TIME).getSelectedValueAsNumber();
    vote_ui.startTimer(this.getGameSession(), '🔹 의심스러운 답변을 선택한 플레이어를 지목해주세요.\n', spy_guess_time);

    const [vote_timer, vote_timer_cancel] = cancelableSleep(spy_guess_time * 1000);
    this.vote_timer_canceler = vote_timer_cancel;
    await vote_timer;

    vote_ui.stopTimer();
  }

  private async showVoteResultStep()
  {
    this.round_step = ROUND_STEP.SHOW_VOTE_RESULT;

    const vote_show_ui = new GameUI();
    vote_show_ui.embed
    .setColor(0x004AAD)
    .setTitle('📝 **[ 투표 결과 공개 ]**')
    .setDescription(`🔹 투표 결과:\n`)

    for(const [voted_count, voted_users] of this.getGameData().makeVotedCountMap())
    {
      if(voted_count === 0)
      {
        continue;
      }

      if(this.most_voted_users.length === 0)
      {
        this.most_voted_users = voted_users;
      }

      for(const voted_user of voted_users)
      {
        vote_show_ui.embed.addFields(
          {
            name: voted_user.getDisplayName(),
            value: `${voted_count}표`,
            inline: false,
          },
        )
      }
    }
    
    this.getGameSession().sendUI(vote_show_ui);
    this.getGameSession().playBGM(BGM_TYPE.PLING);
    await sleep(3000);
  }

  private async spyGuess()
  {
    this.round_step = ROUND_STEP.SPY_GUESS;

    const vote_result_ui = new GameUI();
    vote_result_ui.embed
    .setColor(0x004ADD)
    .setTitle('🔎 **[ 결과 ]**')

    const spy_guessed_user = this.most_voted_users.length !== 1 ? null : this.most_voted_users[0];

    if(!spy_guessed_user) //동 투표거나 아예 무투표
    {
      vote_result_ui.embed
      .setDescription('🔹 최다 득표를 받은 플레이어가 없어서 다음 라운드로 진행합니다.');
    }
    else
    {
      vote_result_ui.embed
      .setDescription(`🔹 최다 득표:\n${spy_guessed_user.getDisplayName()}\n)`);
    }

    this.getGameSession().playBGM(BGM_TYPE.PLING);
    this.getGameSession().sendUI(vote_result_ui);
    await sleep(4000);

    if(!spy_guessed_user)
    {
      return;
    }

    const spy_killing_ui = new GameUI();
    spy_killing_ui.embed
    .setColor(0xD92334)
    .setTitle('☠ **[ 스파이 검사 중 ]**')
    .setDescription(`🔹 ${spy_guessed_user.getDisplayName()} 님을 심문하는 중이에요.`)

    this.getGameSession().sendUI(spy_killing_ui);
    this.getGameSession().playBGM(BGM_TYPE.PUNCH);
    await sleep(3000);

    const spy_result_ui = new GameUI();
    if(this.getGameData().isSpy(spy_guessed_user))
    {
      spy_result_ui.embed
      .setColor(0xD92334)
      .setTitle('👻 **[ 스파이!!! ]**')
      .setDescription(`🔹 ${spy_guessed_user.getDisplayName()} 님은 스파이였습니다!`)
      this.getGameSession().playBGM(BGM_TYPE.GUN_SHOT);
    }
    else
    {
      spy_result_ui.embed
      .setColor(0x004AAD)
      .setTitle('😇 **[ 무고한 시민 ]**')
      .setDescription(`🔹 ${spy_guessed_user.getDisplayName()} 님은 스파이가 아니었습니다!`)
      this.getGameSession().playBGM(BGM_TYPE.ERROR);
    }

    this.getGameSession().sendUI(spy_result_ui);
    this.getGameData().removeInGameUser(spy_guessed_user.getId());
    await sleep(3500);
  }

}