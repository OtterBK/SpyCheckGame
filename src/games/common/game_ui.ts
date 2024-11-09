import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, EmbedBuilder, Message, SelectMenuBuilder } from "discord.js";
import { GameSession } from "./game_session";
import { BGM_TYPE } from "../../managers/bgm_manager";
import { getLogger } from "../../utils/logger";
const logger = getLogger('GameUI');

export class GameUI
{
  public embed: EmbedBuilder = new EmbedBuilder();
  public components: Array<ActionRowBuilder<ButtonBuilder | SelectMenuBuilder>> = [];
  public files: Array<AttachmentBuilder> = [];

  public base_message: Message | null = null;

  private timer_id: NodeJS.Timeout | null = null;
  private timer_bgm_id: NodeJS.Timeout | null = null;
  private timer_paused: boolean = false;

  startTimer(game_session: GameSession, main_description: string, duration_sec: number)
  {
    if(duration_sec >= 10000) //아니 상식적으로 10000초 이상 타이머? 이건 그냥 sec 값을 ms로 잘못 넣은 듯
    {
      logger.warn(`durations sec ${duration_sec} is too large. is it milliseconds?`);
      
    }

    if(duration_sec < 10) //10초 미만은 지원하지 말자
    {
      return;
    }

    //진행 상황 bar
    const progress_bar_max_length = 10;
    let elapsed_time = 0; //시작은 0부터
         
    this.embed.setDescription(
      `${main_description}\n🕛 **${this.getProgressBarString(elapsed_time/duration_sec, progress_bar_max_length)}**`
    );
    game_session.sendUI(this);
 
    this.timer_id = setInterval(() => 
    {
      if(elapsed_time >= duration_sec)
      {
        this.stopTimer();
        return;
      }

      if(this.timer_paused) //타이머 일시 정지됨
      {
        return;
      }

      ++elapsed_time; //1초마다 +1

      this.embed.setDescription(
        `${main_description}\n🕛 **${this.getProgressBarString((elapsed_time/duration_sec), progress_bar_max_length)}**`
      );
      game_session.editUI(this);

      if(duration_sec - elapsed_time === 10) //10초 남았다?
      {
        this.startCountdown(game_session);
      }

    }, 1000);
  }

  stopTimer()
  {
    if(this.timer_id)
    {
      clearInterval(this.timer_id);
    }

    if(this.timer_bgm_id)
    {
      clearInterval(this.timer_bgm_id);
    }
  }

  pauseTimer()
  {
    this.timer_paused = true;
  }

  unpauseTimer()
  {
    this.timer_paused = false;
  }

  getProgressBarString(progress_percentage: number, progress_bar_length: number) 
  {
    // 퍼센트에 따라 채워질 칸 수 계산
    const filled_length = Math.round(Math.min(progress_percentage, 1) * progress_bar_length);

    // 진행 바 생성
    const progress_bar_string = '⏩'.repeat(filled_length) + '⬜'.repeat(progress_bar_length - filled_length);
    return progress_bar_string;
  }

  private startCountdown(game_session: GameSession)
  {
    game_session.stopAudio();
    game_session.playBGM(BGM_TYPE.COUNTDOWN_10);
  }

}