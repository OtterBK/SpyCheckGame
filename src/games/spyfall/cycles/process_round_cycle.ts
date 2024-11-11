import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, GuildMember, Interaction, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { GameUI } from "../../common/game_ui";
import { cancelableSleep, sleep } from "../../../utils/utility";
import { getLogger } from "../../../utils/logger";
import { BGM_TYPE } from "../../../managers/bgm_manager";
import { GameUser } from "../../common/game_user";
import { SpyFallCycle } from "../spyfall_cycle";
import { SpyFallCore } from "../spyfall_core";
import { SPYFALL_OPTION } from "../spyfall_options";
import { GAME_RESULT_TYPE, Place } from "../spyfall_data";
import { RESOURCE_CONFIG } from "../../../config/resource_config";
const logger = getLogger('SpyFallProcessRound');

enum ROUND_STEP
{
  NONE,
  DISCUSSION,
  PAUSE,
  LAST_VOTE,
  STOP,
}

export class ProcessRoundCycle extends SpyFallCycle
{
  private round_step: ROUND_STEP = ROUND_STEP.NONE;
  private previous_step: ROUND_STEP = ROUND_STEP.NONE;
  private discussion_ui: GameUI = new GameUI();
  private remained_discussion_time: number = 0;
  private vote_timer_canceler:  () => number = () => 0;

  constructor(game_core: SpyFallCore)
  {
    super(game_core, `SpyFallProcessRound`);
  }

  async enter(): Promise<boolean>
  {
    this.resetRound();

    return true;
  }

  async act(): Promise<boolean> 
  {
    await this.discussionStep(); //토론 시간
    if(this.round_step === ROUND_STEP.STOP) //토론 끝났는데 stop이면 끝
    {
      return true;
    }

    await this.lastVoteStep(); //최후의 선택
    return true;
  }

  async exit(): Promise<boolean>
  {
    this.discussion_ui.stopTimer();
    this.getGameSession().stopAudio();

    return true;
  }

  onInteractionCreated(interaction: Interaction): void 
  {
    const game_user = this.getGameData().findUser(interaction.user.id);
    if(!game_user)
    {
      return;
    }

    if(this.round_step === ROUND_STEP.PAUSE)
    {
      return;
    }

    if(this.checkVoteEvent(game_user, interaction)) //투표 이벤트
    {
      return;
    }

    if(this.checkGuessPlaceEvent(game_user, interaction)) //스파이가 장소 선택했다면
    {
      return;
    }
  }

  private resetRound()
  {
    this.round_step = ROUND_STEP.NONE;
    this.previous_step = ROUND_STEP.NONE;
    this.discussion_ui = new GameUI();
    this.remained_discussion_time = 0;
    this.vote_timer_canceler = () => 0;
  }

  private async discussionStep()
  {
    this.round_step = ROUND_STEP.DISCUSSION;
    this.discussion_ui.embed
    .setColor(0x004AAD)
    .setTitle('✔ **[ 토론 시작 ]**')

    const vote_component = this.getGameData().getUserSelectComponents('vote', `의심스러운 플레이어 지목하기`);
    this.discussion_ui.components.push(vote_component);

    this.getGameSession().playBGM(BGM_TYPE.PLING);
    const spy_guess_time = this.getOption(SPYFALL_OPTION.SPY_GUESS_TIME).getSelectedValueAsNumber();
    this.discussion_ui.startTimer(this.getGameSession(), 
    `
      🔹 모두에게 역할표를 분배했어요.
      🔹 서로 대화를 나누며 스파이가 누군지 찾아내세요.
      🔹 예) 지금 어떤 옷을 입고있나요?, 여기 온지 얼마나 됐나요?

      \n
      🔸 시민은 **스파이로 의심되는 사람을 지목**해주세요.
      🔸 한명이 과반수 이상 지목되면 그 사람을 심문합니다.
      🔸 무고한 플레이어를 심문하면 시민은 즉시 패배합니다.
      🔸 토론 시간이 모두 지나면 시민은 최후의 선택 시간을 갖습니다.
      \n
      🔸 스파이는 현재 **장소가 어딘지 추측**하거나 끝까지 발각되지 마세요.
      🔸 스파이는 토론 시간 내에 **언제든 장소 추측**이 가능합니다.
    `, 
    spy_guess_time);

    this.remained_discussion_time = spy_guess_time;
    while(this.remained_discussion_time > 0) //시간 다~~ 쓸 때 까지
    {
      const [vote_timer, vote_timer_cancel] = cancelableSleep(this.remained_discussion_time * 1000);
      this.remained_discussion_time = 0; //우선 타이머 시작하면 남은 시간은 0으로
      this.vote_timer_canceler = vote_timer_cancel;
      await vote_timer;

      //어쨌거나 타이머가 끝났다
      // @ts-ignore
      while(this.round_step === ROUND_STEP.PAUSE) //일시정지 중이야?
      {
        await sleep(500); //천천히 기달
      }

      //일시정지가 끝났다.
      // @ts-ignore
      if(this.round_step === ROUND_STEP.STOP) //근데 더 이상 라운드 진행 필요 없으면
      {
        break;
      }
    }

    this.discussion_ui.stopTimer();
    await sleep(2000);
  }

  private async lastVoteStep()
  {
    //최후의 선택
    this.round_step = ROUND_STEP.LAST_VOTE;

    const last_vote_time = 60;
    while(this.getGameData().getSpyRemainedCount() > 0) //스파이 남아있는 동안 최후의 선택
    {
      this.getGameData().clearVoteMap();

      const last_vote_ui = new GameUI();
      last_vote_ui.embed
      .setColor(0x004AAD)
      .setTitle('📩 **[ 최후의 선택 ]**')

      last_vote_ui.components.push(this.getGameData().getUserSelectComponents('vote', `의심스러운 플레이어 지목하기`));
  
      this.getGameSession().playBGM(BGM_TYPE.PLING);
      last_vote_ui.startTimer(this.getGameSession(), `🔹 아직 스파이가 남아있어요!\n🔹 스파이로 의심되는 사람을 지목해주세요.\n🔹 동표인 경우 먼저 지목된 사람을 심문해요.\n`, last_vote_time); 

      const [vote_timer, vote_timer_cancel] = cancelableSleep(last_vote_time * 1000);
      this.vote_timer_canceler = vote_timer_cancel;
      await vote_timer;
  
      last_vote_ui.stopTimer(); //투표 시간 대기

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

      if(most_voted_users.length === 0)
      {
        vote_show_ui.embed
        .setDescription(`🔹 지목된 플레이어가 없어요...`);
      }

      this.getGameSession().sendUI(vote_show_ui);
      await sleep(3000);

      if(most_voted_users.length === 0)
      {
        await this.processSpySurvive(); //스파이 생존 승
      }
      else
      {
        const spy_guessed_user = most_voted_users[0];
        await this.guessSpy(spy_guessed_user!); //스파이 심문 ㄱㄱ
      }

      // @ts-ignore
      if(this.round_step === ROUND_STEP.STOP) //최후의 선택 더 이상 진행 필요 없으면
      {
        return true;
      }
    }
  }


  checkVoteEvent(game_user: GameUser, interaction: Interaction): boolean
  {
    if(this.round_step !== ROUND_STEP.DISCUSSION && this.round_step !== ROUND_STEP.LAST_VOTE)
    {
      return false;
    }

    if(interaction.isStringSelectMenu() === false || interaction.customId !== 'vote')
    {
      return false;
    }

    const selected_value = interaction.values[0];
    const target_game_user = this.getGameData().findUser(selected_value);
    if(!target_game_user)
    {
      game_user.sendInteractionReply(interaction, {
        content: `\`\`\`🔸 게임에 참여 중이지 않는 플레이어를 지목하셨어요... 어떻게...?\`\`\``,
        ephemeral: true
      })
      return true;
    }

    this.getGameData().addUserVoted(game_user, selected_value);

    let vote_status = ``;
    for(const [user, target] of this.getGameData().getVoteMap())
    {
      vote_status += `${this.getGameData().getDisplayName(user)} ➡ ${this.getGameData().getDisplayName(target)}\n`;
    }

    game_user.sendInteractionReply(interaction, {
      content: `\`\`\`🔹 ${game_user.getDisplayName()}님이 ${this.getGameData().getDisplayName(selected_value) ?? selected_value}님을 스파이로 지목했어요.\n${
        this.round_step === ROUND_STEP.DISCUSSION ?
        `🔹 ${Math.ceil(this.getGameData().getInGameUserCount() / 2)}명 이상에게 지목되면 심문을 시작합니다.` //토론 시간에는 과반수만 있으면 됨
        : `🔹 가장 많이 지목된 플레이어를 심문합니다.`
      }
      \n📩 지목 현황\n${vote_status}\`\`\``,
      ephemeral: false
    });
    

    const voted_count = this.getGameData().getVotedCount(target_game_user);
    if(this.round_step === ROUND_STEP.DISCUSSION 
      && voted_count >= this.getGameData().getInGameUserCount() / 2) //토론 시간에 과반 수 이상 지목됐으면
    {
      sleep(1500).then(() => {
        this.getGameSession().sendMessage(`\`\`\`🔸 과반수 이상의 플레이어가 ${target_game_user.getDisplayName()}님을 지목했어요.\n🔸 ${target_game_user.getDisplayName()}님을 심문할게요.\`\`\``)
        this.getGameSession().playBGM(BGM_TYPE.CHAT);
  
        sleep(2000).then(() => {
          this.guessSpy(target_game_user);
        })
      })
    }

    if(this.round_step === ROUND_STEP.LAST_VOTE 
      && this.getGameData().getVoteMap().size === this.getGameData().getInGameUserCount()) //최후의 선택 시간에 모두가 선택했으면
    {
      this.vote_timer_canceler();
      this.getGameSession().sendMessage(`\`\`\`🔸 모든 플레이어가 지목을 완료했어요.\`\`\``)
      this.getGameSession().playBGM(BGM_TYPE.CHAT);
    }

    return true;
  }
  
  checkGuessPlaceEvent(game_user: GameUser, interaction: Interaction): boolean
  {
    if(interaction.isStringSelectMenu() === false 
      || interaction.customId.startsWith('guess_place') === false)
    {
      return false;
    }

    if(this.getGameData().isSpy(game_user) === false)
    {
      game_user.sendInteractionReply(interaction, {
        content: `\`\`\`🔸 당신은 스파이가 아니네요...어떻게 장소를 선택하신거죠?\`\`\``,
        ephemeral: true
      })
      return true;
    }

    if(this.round_step === ROUND_STEP.LAST_VOTE) //최후의 선택 시간이면
    {
      game_user.sendInteractionReply(interaction, {
        content: `\`\`\`🔸 최후의 선택 시간에는 장소 추측을 할 수 없어요.\`\`\``,
        ephemeral: true
      });
      return true;
    }

    game_user.sendInteractionReply(interaction, {
      content: `\`\`\`🔸 ${interaction.values[0]} 장소로 정보를 수집했어요.\`\`\``,
      ephemeral: true
    });


    const selected_place_name = interaction.values[0];
    this.guessPlace(game_user, selected_place_name);

    return true;
  }

  async guessSpy(spy_guessed_user: GameUser)
  {
    this.pause(); //일단 멈춰
    await sleep(3000);

    const spy_killing_ui = new GameUI();
    spy_killing_ui.embed
    .setColor(0xD92334)
    .setTitle('☠ **[ 스파이 검사 중 ]**')
    .setDescription(`🔹 ${spy_guessed_user.getDisplayName()}님을 심문하는 중이에요.`)

    this.getGameSession().sendUI(spy_killing_ui);
    this.getGameSession().playBGM(BGM_TYPE.PUNCH);
    await sleep(3000);

    this.getGameData().removeInGameUser(spy_guessed_user.getId());
    
    const spy_result_ui = new GameUI();
    if(this.getGameData().isSpy(spy_guessed_user))
    {
      spy_result_ui.embed
      .setColor(0xD92334)
      .setTitle('👻 **[ 스파이!!! ]**')
      .setDescription(`🔹 ${spy_guessed_user.getDisplayName()} 님은 스파이였습니다!`)
      this.getGameSession().playBGM(BGM_TYPE.GUN_SHOT);
      this.getGameSession().sendUI(spy_result_ui);
      await sleep(3500);

      if(this.getGameData().getSpyRemainedCount() > 0) //스파이 아직 남아있다면
      {
        this.getGameSession().sendMessage(`\`\`\`🔹 아직 스파이가 남아있어요.\`\`\``);
        this.resume(); //속행
      }
      else
      {
        await this.processCivilFindAllSpy(); //스파이 다 찾으면
      }
    }
    else
    {
      spy_result_ui.embed
      .setColor(0x004AAD)
      .setTitle('😇 **[ 무고한 시민 ]**')
      .setDescription(`🔹 ${spy_guessed_user.getDisplayName()} 님은 스파이가 아니었습니다!`)
      this.getGameSession().playBGM(BGM_TYPE.ERROR);
      this.getGameSession().sendUI(spy_result_ui);
      await sleep(3500);

      await this.processSpyFake(); //스파이가 페이크 잘 줬으면
    }
  }

  async guessPlace(game_user: GameUser, selected_place_name: string)
  {
    this.pause(); //일단 멈춰

    const guessing_ui = new GameUI();
    guessing_ui.embed
    .setColor(0xBF0000)
    .setTitle(`🐱‍👤 **[ 스파이의 정보 공개 ]**`)
    .setDescription(`🔹 잠깐! 스파이 ${game_user.getDisplayName()}님이 정보 수집을 완료했습니다!`)

    this.getGameSession().sendUI(guessing_ui);
    this.getGameSession().playBGM(BGM_TYPE.PLING);

    await sleep(3000);

    const place_ui = new GameUI();
    place_ui.embed
    .setColor(0xBF0000)
    .setTitle(`✉ **[ 정보를 검증하는 중... ]**`)
    .setDescription(`🔹 스파이가 선택한 장소: **${selected_place_name}**`)
    .setImage(`attachment://thumbnail.png`)
    
    place_ui.files.push(
      new AttachmentBuilder(`${RESOURCE_CONFIG.SPYFALL_PATH}/thumbnails/${selected_place_name}.png`, {
        name: `thumbnail.png`
      }
    ));

    this.getGameSession().sendUI(place_ui);
    this.getGameSession().playBGM(BGM_TYPE.PLING);
    await sleep(4500);

    const current_place = this.getGameData().getCurrentPlace();
    if(current_place.getName() === selected_place_name)
    {
      await this.processSpySuccessGuessPlace(game_user); //스파이가 장소 추측 성공
    }
    else
    {
      await this.processSpyFailedGuessPlace(game_user); //스파이 장소 추측 실패
    }
  }

  async processSpyFake()
  {
    this.getGameData().setGameResult(GAME_RESULT_TYPE.SPY_WIN);

    const result_ui = new GameUI();
    result_ui.embed
    .setColor(0xBF0000)
    .setTitle('🐱‍👤 **[ 스파이의 계획 성공 ]**')
    .setDescription(`🔹 시민들이 무고한 사람을 처형했어요.`);
    
    this.getGameSession().playBGM(BGM_TYPE.FAIL);
    this.getGameSession().sendUI(result_ui);

    await sleep(3500);
    this.round_step = ROUND_STEP.STOP;
  }

  async processSpySurvive()
  {
    this.getGameData().setGameResult(GAME_RESULT_TYPE.SPY_WIN);

    const result_ui = new GameUI();
    result_ui.embed
    .setColor(0xBF0000)
    .setTitle('🐱‍👤 **[ 스파이의 생존 성공 ]**')
    .setDescription(`🔹 스파이가 살아남았어요.`)

    this.getGameSession().sendUI(result_ui);
    this.getGameSession().playBGM(BGM_TYPE.SUCCESS);

    
    await sleep(3500);
    this.round_step = ROUND_STEP.STOP;
  }

  async processSpySuccessGuessPlace(game_user: GameUser)
  {
    this.getGameData().setGameResult(GAME_RESULT_TYPE.SPY_WIN);

    const result_ui = new GameUI();
    result_ui.embed
    .setColor(0xBF0000)
    .setTitle('🐱‍👤 **[ 스파이의 정보 수집 성공 ]**')
    .setDescription(`🔹 스파이 ${game_user.getDisplayName()}님이 현재 장소를 알아냈어요.`)

    this.getGameSession().sendUI(result_ui);
    this.getGameSession().playBGM(BGM_TYPE.SUCCESS);

    await sleep(3500);
    this.round_step = ROUND_STEP.STOP;
  }

  async processSpyFailedGuessPlace(game_user: GameUser)
  {
    // this.getGameData().setGameResult(GAME_RESULT_TYPE.CIVILIAN_WIN);

    const result_ui = new GameUI();
    result_ui.embed
    .setColor(0x004AAD)
    .setTitle('✔ **[ 스파이의 정보 수집 실패 ]**')
    .setDescription(`🔹 스파이가 현재 장소를 알아내지 못했어요.`)

    this.getGameSession().sendUI(result_ui);
    this.getGameSession().playBGM(BGM_TYPE.FAIL);

    await sleep(3000);

    this.getGameData().removeInGameUser(game_user.getId());
    const spy_result_ui = new GameUI();
    spy_result_ui.embed
    .setColor(0x004AAD)
    .setTitle('👻 **[ 처형 ]**')
    .setDescription(`🔹 ${game_user.getDisplayName()}님은 처형되었습니다.`)
    this.getGameSession().playBGM(BGM_TYPE.GUN_SHOT);
    
    this.getGameSession().sendUI(spy_result_ui);
    await sleep(3500);

    if(this.getGameData().getSpyRemainedCount() > 0) //스파이 아직 남아있다면
    {
      this.getGameSession().sendMessage(`\`\`\`🔹 아직 스파이가 남아있어요.\`\`\``);
      this.resume(); //계속 속행
    }
    else
    {
      await this.processCivilFindAllSpy(); //스파이 다 찾았다
    }
  }

  async processCivilFindAllSpy()
  {
    this.getGameData().setGameResult(GAME_RESULT_TYPE.CIVILIAN_WIN); 

    const result_ui = new GameUI();
    result_ui.embed
    .setColor(0x004AAD)
    .setTitle('✔ **[ 모든 스파이 색출 성공 ]**')
    .setDescription(`🔹 모든 스파이를 찾아냈어요!`)

    this.getGameSession().sendUI(result_ui);
    this.getGameSession().playBGM(BGM_TYPE.SUCCESS);

    await sleep(3500);
    this.round_step = ROUND_STEP.STOP;
  }

  pause()
  {
    this.previous_step = this.round_step;
    this.round_step = ROUND_STEP.PAUSE;
    this.discussion_ui.pauseTimer(); //타이머 잠시 중지
    this.getGameSession().pauseAudio();

    this.remained_discussion_time = this.vote_timer_canceler(); //sleep 타이머는 그냥 끝내고 타이머 남은 시간 저장
  }

  resume()
  {
    this.round_step = this.previous_step;
    this.discussion_ui.unpauseTimer();
    this.getGameSession().unpauseAudio();
  }

}