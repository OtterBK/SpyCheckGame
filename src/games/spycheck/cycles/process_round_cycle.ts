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
  ANSWER,
  VOTE,
  VOTE_RESULT
}

export class ProcessRoundCycle extends SpyCheckCycle
{
  private current_question: Question | null = null;
  private answer_timer_canceler: () => void = () => {};
  private vote_timer_canceler:  () => void = () => {};

  private round_num: number = 0;

  private step: ROUND_STEP = ROUND_STEP.ANSWER;

  constructor(game_core: SpyCheckCore)
  {
    super(game_core, `SpyCheckProcessRound`);
  }

  async enter(): Promise<boolean>
  {
    this.current_question = null;
    this.step = ROUND_STEP.ANSWER;
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

      if(this.getGameData().isSpy(user))
      {
        answer_select_ui.embed
        .setDescription(`🔹 질문: **[스파이는 질문 내용을 볼 수 없어요.]**`)
        .setFooter({text: '아무 답변이나 선택하세요.'})
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
    
    const answer_show_ui = new GameUI();
    answer_show_ui.embed
    .setColor(0xFFD044)
    .setTitle('📝 **[ 답변 공개 ]**')
    .setDescription(`
      🔹 질문:\n${this.current_question.question_text}\n
    `)

    for(const user of this.getGameData().getInGameUsers())
    {
      let selected_answer_value = this.getGameData().getAnswerSelectedValue(user);
      if(!selected_answer_value)
      {
        user.sendPrivateMessage(`\`\`\`🔸 답변을 선택하지 않으셔서 무작위로 선택됐어요.\`\`\``);
        selected_answer_value = this.getGameData().getRandomAnswer(this.current_question.answer_type, this.getGameData().getInGameUsers()) ?? 'ERROR';
      }

      answer_show_ui.embed.addFields(
        {
          name: user.getDisplayName(),
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
    const spy_guess_time = this.getGameCore().getGameOptions().getOption(SPYCHECK_OPTION.SPY_GUESS_TIME).getSelectedValueAsNumber();
    vote_ui.startTimer(this.getGameSession(), '🔹 의심스러운 답변을 선택한 플레이어를 지목해주세요.\n', spy_guess_time);

    this.step = ROUND_STEP.VOTE;

    const [vote_timer, vote_timer_cancel] = cancelableSleep(spy_guess_time * 1000);
    this.vote_timer_canceler = vote_timer_cancel;
    await vote_timer;

    vote_ui.stopTimer();

    this.step = ROUND_STEP.VOTE_RESULT;

    const vote_show_ui = new GameUI();
    vote_show_ui.embed
    .setColor(0x004AAD)
    .setTitle('📝 **[ 투표 결과 공개 ]**')
    .setDescription(`🔹 투표 결과:\n`)

    let most_voted_users: Array<GameUser> = [];
    for(const [voted_count, voted_users] of this.getGameData().makeVotedCountMap())
    {
      if(voted_count === 0)
      {
        continue;
      }

      if(most_voted_users.length === 0)
      {
        most_voted_users = voted_users;
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
      .setDescription(`🔹 최다 득표:\n${most_voted_users.map(game_user => game_user.getDisplayName() + '\n')}`);
    }

    await sleep(4000);

    const spy_guessed_user = most_voted_users[0];

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

    if(interaction.isStringSelectMenu() && interaction.customId === 'answer_select' && this.step === ROUND_STEP.ANSWER) //답변 선택함
    {
      const selected_value = interaction.values[0];
      const select_map_size = this.getGameData().addUserAnswerSelect(game_user, selected_value);

      if(select_map_size === this.getGameData().getInGameUserCount()
        && this.answer_timer_canceler) //모두 선택했으면 바로 skip
      {
        this.answer_timer_canceler(); //타이머 중지
        this.getGameSession().sendMessage(`\`\`\`🔸 모든 플레이어가 답변을 선택했어요.\`\`\``)
        this.getGameSession().playBGM(BGM_TYPE.CHAT);
      }

      game_user.sendInteractionReply(interaction, {
        content: `\`\`\`🔸 선택한 답변: ${selected_value}\`\`\``,
        ephemeral: true
      })
  
      return;
    }

    if(this.step === ROUND_STEP.VOTE &&
      (interaction.isStringSelectMenu() && interaction.customId === 'vote') || 
      (interaction.isButton() && interaction.customId === 'vote_skip')) //투표함
    {
      const selected_value = (interaction.isStringSelectMenu() && interaction.customId === 'vote') ? interaction.values[0] : '무투표';
      const select_map_size = this.getGameData().addUserVoted(game_user, selected_value);

      if(select_map_size === this.getGameData().getInGameUserCount()
        && this.vote_timer_canceler) //모두 선택했으면 바로 skip
      {
        this.vote_timer_canceler(); //타이머 중지
        this.getGameSession().sendMessage(`\`\`\`🔸 모든 플레이어가 투표했어요.\`\`\``)
        this.getGameSession().playBGM(BGM_TYPE.CHAT);
      }

      if(interaction.customId === 'vote')
      {
        game_user.sendInteractionReply(interaction, {
          content: `\`\`\`🔸 선택한 플레이어: ${this.getGameData().getDisplayName(selected_value) ?? selected_value}\`\`\``,
          ephemeral: true
        })
      }
      else
      {
        game_user.sendInteractionReply(interaction, {
          content: `\`\`\`🔸 투표를 스킵했어요.\`\`\``,
          ephemeral: true
        })
      }
  
      return;
    }
  }

}