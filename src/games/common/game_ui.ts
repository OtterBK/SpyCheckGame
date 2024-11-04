import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, Message, SelectMenuBuilder } from "discord.js";
import { GameSession } from "./game_session";
import { BGM_TYPE } from "../../managers/bgm_manager";

export class GameUI
{
  public embed: EmbedBuilder = new EmbedBuilder();
  public components: Array<ActionRowBuilder<ButtonBuilder | SelectMenuBuilder>> = [];

  public base_message: Message | null = null;

  private timer_id: NodeJS.Timeout | null = null;
  private timer_bgm_id: NodeJS.Timeout | null = null;

  startTimer(game_session: GameSession, main_description: string, duration: number)
  {
    if(duration < 10000) //10초 미만은 지원하지 말자
    {
      return;
    }

    //진행 상황 bar, 10%마다 호출하자
    const progress_max_percentage = 10;
    const progress_bar_interval = duration / progress_max_percentage;
    let progress_percentage = 0; //시작은 0부터
         
    this.embed.setDescription(
      `${main_description}\n🕛 **${this.getProgressBarString(progress_percentage, progress_max_percentage)}**`
    );
    game_session.sendUI(this);
 
    this.timer_id = setInterval(() => 
    {
      if(progress_percentage === progress_max_percentage)
      {
        this.stopTimer();
        return;
      }

      this.embed.setDescription(
        `${main_description}\n🕛 **${this.getProgressBarString(++progress_percentage, progress_max_percentage)}**`
      );
      game_session.editUI(this);

    }, progress_bar_interval);

    this.timer_bgm_id = setTimeout(() =>  //10초 남으면 카운트다운
    {
      game_session.stopAudio();
      game_session.playBGM(BGM_TYPE.COUNTDOWN_10);
    }, duration - 10000);
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

  getProgressBarString(progress_percentage: number, progress_max_percentage: number)
  {
    let progress_bar_string = '';
    for(let i = 0; i < progress_max_percentage; i++)
    {
      progress_bar_string += i <= progress_percentage ? '⏩' : '⬜';
    }
    return progress_bar_string;
  }
}