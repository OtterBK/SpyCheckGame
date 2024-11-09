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
  VOTE,
  PAUSE,
  LAST_VOTE,
  STOP,
}

export class ProcessRoundCycle extends SpyFallCycle
{
  private vote_timer_canceler:  () => void = () => {};
  private round_step: ROUND_STEP = 0;
  private vote_ui: GameUI = new GameUI();
  constructor(game_core: SpyFallCore)
  {
    super(game_core, `SpyFallProcessRound`);
  }

  async enter(): Promise<boolean>
  {
    this.round_step = ROUND_STEP.VOTE;
    this.vote_timer_canceler = () => {};

    return true;
  }

  async act(): Promise<boolean> 
  {
    this.vote_ui = new GameUI();
    this.vote_ui.embed
    .setColor(0x004AAD)
    .setTitle('✔ **[ 게임 시작 ]**')

    const vote_component = this.getGameData().getUserSelectComponents('vote', `의심스러운 플레이어 지목하기`);
    this.vote_ui.components.push(vote_component);

    this.round_step = ROUND_STEP.VOTE;
    this.getGameSession().playBGM(BGM_TYPE.PLING);
    const spy_guess_time = this.getGameCore().getGameOptions().getOption(SPYFALL_OPTION.SPY_GUESS_TIME).getSelectedValueAsNumber();
    this.vote_ui.startTimer(this.getGameSession(), 
    `
      🔹 모두에게 역할표를 분배했어요.
      🔹 서로에게 대화를 나누며 스파이가 누군지 찾아내세요.
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

    const [vote_timer, vote_timer_cancel] = cancelableSleep(spy_guess_time * 1000);
    this.vote_timer_canceler = vote_timer_cancel;
    await vote_timer;

    this.vote_ui.stopTimer();
    // @ts-ignore
    if(this.round_step === ROUND_STEP.STOP) //더 이상 라운드 진행 필요 없으면
    {
      return true;
    }

    this.round_step = ROUND_STEP.LAST_VOTE;
    await sleep(2000);

    //최후의 선택
    let spy_remained_count = this.getGameData().getSpyRemainedCount();

    this.getGameData().clearVoteMap();
    for(let i = 0; i < spy_remained_count; ++i)
    {
      this.round_step = ROUND_STEP.LAST_VOTE;

      this.vote_ui = new GameUI();
      this.vote_ui.embed
      .setColor(0x004AAD)
      .setTitle('📩 **[ 최후의 선택 ]**')

      this.vote_ui.components.push(this.getGameData().getUserSelectComponents('vote', `의심스러운 플레이어 지목하기`));
  
      this.getGameSession().playBGM(BGM_TYPE.PLING);
      this.vote_ui.startTimer(this.getGameSession(), `
      ${i === 0 ? `` : `🔹 아직 스파이가 남아있어요!\n`}
        🔹 스파이로 의심되는 사람을 지목해주세요.
        🔹 동표인 경우 먼저 지목된 사람을 심문해요.`, 60); 

      const [vote_timer, vote_timer_cancel] = cancelableSleep(spy_guess_time * 1000);
      this.vote_timer_canceler = vote_timer_cancel;
      await vote_timer;

      const voted_count_map = this.getGameData().makeVotedCountMap();
      if(voted_count_map.size === 0)
      {
        this.vote_ui = new GameUI();
        this.vote_ui.embed
        .setColor(0xBB0000)
        .setTitle('❌ **[ 심문 실패 ]**')
        .setDescription(`🔹 지목된 플레이어가 아무도 없어요.`)

        await this.processSpySurvive();
      }
      else
      {
        const spy_guessed_user = voted_count_map.entries().next().value?.[1][0] ?? null;
        await this.guessSpy(spy_guessed_user!);

        // @ts-ignore
        if(this.stop_round === true) //라운드 더 이상 진행 필요 없으면
        {
          return true;
        }
      }

      this.getGameData().clearVoteMap();
    }

    await this.processCivilWin();
    return true;
  }

  async exit(): Promise<boolean>
  {
    this.vote_ui.stopTimer();
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

    if(interaction.isStringSelectMenu() && this.checkGuessPlaceEvent(game_user, interaction)) //스파이가 장소 선택했다면
    {
      this.pause(); //일단 멈춰

      const selected_place_name = interaction.values[0];
      this.guessPlace(game_user, selected_place_name)
      .then(() => {
        if(this.round_step === ROUND_STEP.STOP) //머야 맞춘거야?
        {
          this.vote_timer_canceler(); //타이머 멈춰
        }
        else //에잉 못 맞췄어?
        {
          let spy_remained_count = this.getGameData().getSpyRemainedCount();
          if(spy_remained_count === 0) //머야 스파이 다 죽었어?
          {
            this.vote_timer_canceler(); //타이머 멈춰
          }
          else //스파이 아직 남아있다면
          {
            this.resume(); //킵 고잉
          }
        }
      });
      
      return;
    }
  }

  checkVoteEvent(game_user: GameUser, interaction: Interaction): boolean
  {
    if(this.round_step !== ROUND_STEP.VOTE && this.round_step !== ROUND_STEP.LAST_VOTE)
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

    let vote_status = ``;
    for(const [user, target] of this.getGameData().getVoteMap())
    {
      vote_status += `${this.getGameData().getDisplayName(user)} ➡ ${this.getGameData().getDisplayName(target)}\n`;
    }

    game_user.sendInteractionReply(interaction, {
      content: `\`\`\`
      🔹 ${game_user.getDisplayName()}님이 ${this.getGameData().getDisplayName(selected_value) ?? selected_value}님을 스파이로 지목했어요.
      ${this.round_step === ROUND_STEP.VOTE ?
        `🔹 ${Math.ceil(this.getGameData().getInGameUserCount() / 2)}명 이상에게 지목되면 심문을 시작합니다.`
        : ''
      }
      \n
      📩 지목 현황
      ${vote_status}
      \`\`\``,
      ephemeral: false
    });

    const voted_count = this.getGameData().getVotedCount(target_game_user);
    if(this.round_step === ROUND_STEP.VOTE && voted_count >= this.getGameData().getInGameUserCount() / 2) //과반 수 이상 선택했으면
    {
      this.pause();

      this.getGameSession().sendMessage(`\`\`\`🔸 과반 수 이상의 플레이어가 ${target_game_user.getDisplayName()}님을 지목했어요.\n🔸${target_game_user.getDisplayName()} 님을 심문할게요.\`\`\``)
      this.getGameSession().playBGM(BGM_TYPE.CHAT);

      this.guessSpy(target_game_user)
      .then(() => 
      {
        if(this.round_step !== ROUND_STEP.STOP) //스파이를 찾았다면 킵 고잉
        {
          this.resume();
        }
        else //못 찾으면?
        {
          this.vote_timer_canceler(); //바로 타이머 중지
        }
      });
    }

    if(this.round_step === ROUND_STEP.LAST_VOTE 
      && this.getGameData().getVoteMap().size === this.getGameData().getInGameUserCount()) //모두가 선택했으면
    {
      this.vote_timer_canceler();
      this.getGameSession().sendMessage(`\`\`\`🔸 모든 플레이어가 지목을 완료했어요.\`\`\``)
      this.getGameSession().playBGM(BGM_TYPE.CHAT);
    }

    return true;
  }
  
  checkGuessPlaceEvent(game_user: GameUser, interaction: Interaction): boolean
  {
    if(interaction.isStringSelectMenu() === false || interaction.customId.startsWith('guess_place') === false)
    {
      return false;
    }

    if(this.getGameData().isSpy(game_user))
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
      })
      return true;
    }

    return true;
  }

  async guessSpy(spy_guessed_user: GameUser)
  {
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

      this.processSpyWin();
    }

    this.getGameSession().sendUI(spy_result_ui);
    this.getGameData().removeInGameUser(spy_guessed_user.getId());

    await sleep(3500);
  }

  async guessPlace(game_user: GameUser, selected_place_name: string)
  {
    const guessing_ui = new GameUI();
    guessing_ui.embed
    .setColor(0xBF0000)
    .setTitle(`🐱‍👤 **[ 스파이의 정보 공개 ]**`)
    .setDescription(`🔹 잠깐! 스파이 ${game_user.getDisplayName()}님이 정보 수집을 완료했습니다!`)

    this.getGameSession().sendUI(guessing_ui);

    await sleep(3000);

    const place_ui = new GameUI();
    place_ui.embed
    .setColor(0xBF0000)
    .setTitle(`✉ **[ 정보를 검증하는 중... ]**`)
    .setDescription(`🔹 스파이가 선택한 장소: **${selected_place_name}**`)
    .setImage(`attachment://${selected_place_name}.webp`)
    
    place_ui.files.push(
      new AttachmentBuilder(`${RESOURCE_CONFIG.SPYFALL_PATH} + /thumbnails/${place_ui}.webp`
    ));

    await sleep(3000);

    const current_place = this.getGameData().getCurrentPlace();
    if(current_place.getName() === selected_place_name)
    {
      this.processSpySuccessGuessPlace(game_user);
    }
    else
    {
      this.processSpyFailedGuessPlace(game_user);
    }
  }

  async processSpyWin()
  {
    this.getGameData().setGameResult(GAME_RESULT_TYPE.SPY_WIN);
    this.getGameSession().playBGM(BGM_TYPE.SCORE_ALARM);

    const result_ui = new GameUI();
    result_ui.embed
    .setTitle('🐱‍👤 **[ 스파이의 계획 성공 ]**')
    .setDescription(`🔹 시민들이 무고한 사람을 처형했어요...`);

    this.getGameSession().sendUI(result_ui);

    this.round_step = ROUND_STEP.STOP;

    await sleep(3500);
  }

  async processSpySurvive()
  {
    this.getGameData().setGameResult(GAME_RESULT_TYPE.SPY_WIN);
    this.getGameSession().playBGM(BGM_TYPE.SCORE_ALARM);

    const result_ui = new GameUI();
    result_ui.embed
    .setTitle('🐱‍👤 **[ 스파이의 생존 성공 ]**')
    .setDescription(`🔹 스파이가 살아남았어요.`)

    this.getGameSession().sendUI(result_ui);

    this.round_step = ROUND_STEP.STOP;

    await sleep(3500);
  }

  async processSpySuccessGuessPlace(game_user: GameUser)
  {
    this.getGameData().setGameResult(GAME_RESULT_TYPE.SPY_WIN);
    this.getGameSession().playBGM(BGM_TYPE.SCORE_ALARM);

    const result_ui = new GameUI();
    result_ui.embed
    .setTitle('🐱‍👤 **[ 스파이의 정보 수집 성공 ]**')
    .setDescription(`🔹 스파이 ${game_user.getDisplayName()}님이 현재 장소를 알아냈어요.`)

    this.getGameSession().sendUI(result_ui);

    this.round_step = ROUND_STEP.STOP;

    await sleep(3500);
  }

  async processSpyFailedGuessPlace(game_user: GameUser)
  {
    // this.getGameData().setGameResult(GAME_RESULT_TYPE.CIVILIAN_WIN);
    this.getGameSession().playBGM(BGM_TYPE.SCORE_ALARM);

    const result_ui = new GameUI();
    result_ui.embed
    .setTitle('✔ **[ 스파이의 정보 수집 실패 ]**')
    .setDescription(`🔹 스파이가 현재 장소를 알아내지 못했어요.`)

    this.getGameSession().sendUI(result_ui);

    await sleep(3000);

    const spy_result_ui = new GameUI();

    spy_result_ui.embed
    .setColor(0xD92334)
    .setTitle('👻 **[ 처형 ]**')
    .setDescription(`🔹 ${game_user.getDisplayName()}님은 처형되었습니다.`)
    this.getGameSession().playBGM(BGM_TYPE.GUN_SHOT);
    
    this.getGameSession().sendUI(spy_result_ui);
    this.getGameData().removeInGameUser(game_user.getId());

    await sleep(3500);
  }

  async processCivilWin()
  {
    this.getGameData().setGameResult(GAME_RESULT_TYPE.CIVILIAN_WIN); 

    const result_ui = new GameUI();
    result_ui.embed
    .setTitle('✔ **[ 모든 스파이 색출 성공 ]**')
    .setDescription(`🔹 모든 스파이를 찾아냈어요!`)

    this.getGameSession().sendUI(result_ui);

    this.round_step = ROUND_STEP.STOP;

    await sleep(3500);
  }

  pause()
  {
    this.round_step = ROUND_STEP.PAUSE;
    this.vote_ui.pauseTimer(); //타이머 잠시 중지
    this.getGameSession().pauseAudio();
  }

  resume()
  {
    this.round_step = ROUND_STEP.VOTE;
    this.vote_ui.unpauseTimer();
    this.getGameSession().unpauseAudio();
  }

}