import { ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildMember, Interaction } from "discord.js";
import { getLogger } from "../../utils/logger";
import { GameUI } from "./game_ui";
import { GameCore } from "./game_core";
import { GameSession } from "../game_session";
const logger = getLogger('GameCycle');

export enum CycleType
{
  LOBBY,
  START,
  PREPARE_ROUND,
  PROCESS_ROUND,
  CLEAR_ROUND,
  ENDING,
  EXPIRE
}

export abstract class GameCycle
{
  private game_core: GameCore;
  private cycle_name: string;
  private next_cycle_type: CycleType | null = null;

  constructor(game_core: GameCore, cycle_name: string)
  {
    this.game_core = game_core;
    this.cycle_name = cycle_name;
  }

  setNextCycleType(next_cycle: CycleType)
  {
    this.next_cycle_type = next_cycle;
  }

  goToNextCycle()
  {
    if(!this.next_cycle_type)
    {
      logger.warn(`Cycle ${this.cycle_name}'s next cycle type is null`);
      return;
    }

    this.getGameCore().doCycle(this.next_cycle_type);
    return;
  }

  getGameCore(): GameCore
  {
    return this.game_core;
  }

  getGameSession(): GameSession | null
  {
    return this.game_core.getGameSession();
  }

  abstract enter(): boolean;
  abstract act(): boolean;
  abstract exit(): boolean;

  abstract onInteractionCreated(interaction: Interaction): void

}

export abstract class LobbyCycleTemplate extends GameCycle
{
  private ui: GameUI = new GameUI();
  private game_title: string = '';
  private game_thumbnail: string = '';

  constructor(game_core: GameCore, cycle_name: string)
  {
    super(game_core, cycle_name);
  }

  enter(): boolean 
  {
    //embed
    this.ui.embed
      .setColor(0x87CEEB)
      .setTitle(`**🎮 [ ${this.game_title} ]**`)
      .setThumbnail(`${this.game_thumbnail}`)
      .setFooter(
        {
          text: `주최자: ${this.getGameSession()?.getHost().displayName}`,
          iconURL: `${this.getGameSession()?.getHost().displayAvatarURL()}`
        });

    const lobby_participant_btn = new ActionRowBuilder<ButtonBuilder>()
      .addComponents (
        new ButtonBuilder()
          .setCustomId('join')
          .setLabel('참가')
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId('leave')
          .setLabel('퇴장')
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId('rule_book')
          .setLabel('게임 설명')
          .setStyle(ButtonStyle.Primary),
      );

    //components
    const lobby_host_btn = new ActionRowBuilder<ButtonBuilder>()
      .addComponents (
        new ButtonBuilder()
          .setCustomId('start')
          .setLabel('시작')
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('setting')
          .setLabel('설정')
          .setStyle(ButtonStyle.Secondary),
      );

    this.ui.components.push(lobby_participant_btn);
    this.ui.components.push(lobby_host_btn);

    return true;
  }

  act(): boolean 
  {
    this.refreshUI();
    this.getGameSession()?.sendUI(this.ui);

    return false; //stop cycling
  }

  exit(): boolean 
  {
    return true;
  }

  onInteractionCreated(interaction: Interaction): void 
  {
    if(!interaction.isButton() && !interaction.isStringSelectMenu())
    {
      return;
    }

    const member = interaction.member as GuildMember;
    if(!member)
    {
      return;
    }
    const id = interaction.customId;

    if(id === 'join')
    {
      if(this.getGameSession()?.findUser(member.id))
      {
        interaction.reply(
          {
            content: `\`\`\`🔸 이미 ${this.game_title} 게임에 참가 중이에요.\`\`\``,
            ephemeral: true
          }
        );
        return;
      }

      this.getGameSession()?.addParticipant(member);

      this.refreshUI();
      this.getGameSession()?.sendUI(this.ui);

      interaction.reply(
        {
          content: `\`\`\`🔸 ${this.game_title} 게임에 참가했어요.\`\`\``,
          ephemeral: true
        }
      );
      
      return;
    }

    if(id === 'leave')
    {
      if(!this.getGameSession()?.findUser(member.id))
      {
        interaction.reply(
          {
            content: `\`\`\`🔸 ${this.game_title} 게임에 참가 중이지 않네요.\`\`\``,
            ephemeral: true
          }
        );
        return;
      }

      this.getGameSession()?.removeParticipant(member.id);

      this.refreshUI();
      this.getGameSession()?.sendUI(this.ui);

      interaction.reply(
        {
          content: `\`\`\`🔸 ${this.game_title} 게임에서 떠났어요.\`\`\``,
          ephemeral: true
        }
      );

      return;
    }

    if(id === 'rule_book')
    {
      interaction.reply(
        {
          content: `${this.getGameRuleDescription()}`,
          ephemeral: true
        }
      );

      return;
    }

    if(id === 'start')
    {
      if(this.getGameSession())

        this.exit();
      this.goToNextCycle();

      interaction.deferReply();
      
      return;
    }

    if(id === 'setting')
    {
      return;
    }
  }

  refreshUI()
  {
    let participants_status = `\`\`\`📋 참가자 목록\n\n`;

    const game_session = this.getGameSession();
    if(!game_session)
    {
      return;
    }

    for(const user of game_session.getParticipants())
    {
      participants_status += `🔹 ${user.displayName}\n`;
    }
    participants_status += `\`\`\``;

    this.ui.embed
      .setDescription(participants_status);
  }

  setGameTitle(title: string)
  {
    this.game_title = title;
  }

  setGameThumbnail(thumbnail: string)
  {
    this.game_thumbnail = thumbnail;
  }

  abstract getGameRuleDescription(): string;

}