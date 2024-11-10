import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, GuildMember, Interaction, RepliableInteraction, SelectMenuInteraction } from "discord.js";
import { getLogger } from "../../utils/logger";
import { GameUI } from "./game_ui";
import { GameCore } from "./game_core";
import { GameSession } from "./game_session";
import { saveGameOptionsToCache } from "../factory";
import { deleteMessage } from "../../utils/utility";
import { BGM_TYPE } from "../../managers/bgm_manager";
import { GameUser } from "./game_user";
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

  private expired: boolean = false;

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
  }

  getGameCore(): GameCore
  {
    return this.game_core;
  }

  getGameSession(): GameSession
  {
    return this.game_core.getGameSession();
  }

  expire(): void
  {
    this.expired = true;
  }

  isExpired(): boolean
  {
    return this.expired;
  }

  abstract enter(): Promise<boolean>;
  abstract act(): Promise<boolean>;
  abstract exit(): Promise<boolean>;
  abstract onInteractionCreated(interaction: Interaction): void
}

export abstract class LobbyCycleTemplate extends GameCycle
{
  private lobby_ui: GameUI = new GameUI();

  constructor(game_core: GameCore, cycle_name: string)
  {
    super(game_core, cycle_name);
  }

  async enter(): Promise<boolean> 
  {
    this.lobby_ui.embed
      .setColor(0x87CEEB)
      .setTitle(`**🎮 [ ${this.getGameCore().getGameName()} ]**`)
      .setThumbnail(`${this.getGameCore().getGameThumbnail()}`)
      .setFooter({
        text: `주최자: ${this.getGameSession().getHost()?.displayName}`,
        iconURL: `${this.getGameSession().getHost()?.displayAvatarURL()}`
      });

    const lobby_participant_btn = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder().setCustomId('join').setLabel('참가').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('leave').setLabel('퇴장').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('rule_book').setLabel('게임 설명').setStyle(ButtonStyle.Primary),
      );

    const lobby_host_btn = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder().setCustomId('start').setLabel('시작').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('setting').setLabel('설정').setStyle(ButtonStyle.Secondary),
      );

    this.lobby_ui.components.push(lobby_participant_btn);
    this.lobby_ui.components.push(lobby_host_btn);

    //game option select menu

    this.getGameSession().playBGM(BGM_TYPE.LOBBY_CREATED);

    return true;
  }

  async act(): Promise<boolean>  
  {
    this.refreshUI();
    this.getGameSession().sendUI(this.lobby_ui);
    return false; //Lobby Cycle은 'start' 눌렀을 때만 명시적으로 다음 cycle로 간다.
  }

  async exit(): Promise<boolean>  
  {
    return true;
  }

  onInteractionCreated(interaction: Interaction): void 
  {
    if(!interaction.isRepliable() || 
      (!interaction.isButton() && !interaction.isStringSelectMenu())
    )
    {
      return;
    }

    const id = interaction.customId;
    const member = interaction.member as GuildMember;
    if(!member)
    {
      return;
    }

    switch (id) 
    {
    case 'join':
      this.handleJoin(interaction, member);
      return;
    case 'leave':
      this.handleLeave(interaction, member);
      return;
    case 'rule_book':
      this.handleRuleBook(interaction);
      return;
    case 'start':
      this.handleStart(interaction, member);
      return;
    case 'setting':
      this.handleSetting(interaction, member);
      return;
    case 'option_type_select':
      this.handleOptionTypeSelect(interaction, member);
      return;
    }

    if(id.startsWith('option_value_select'))
    {
      this.handleOptionValueSelect(interaction, member);
    }
  }

  private handleJoin(interaction: RepliableInteraction, member: GuildMember)
  {
    const game_user = this.getGameSession().findUser(member.id);
    if(game_user)
    {
      game_user.sendInteractionReply(interaction, { content: `\`\`\`🔸 이미 ${this.getGameCore().getGameName()} 게임에 참가 중이에요.\`\`\``, ephemeral: true });
      return;
    }

    const players_count = this.getGameSession().getParticipants.length;
    if(players_count >= this.getGameCore().getMaxPlayers())
    {
      interaction.reply({ content: `\`\`\`🔸 ${this.getGameCore().getGameName()} 게임은 최대 ${this.getGameCore().getMaxPlayers()}명까지만 할 수 있어요.\`\`\``, ephemeral: true });
      return;
    }

    const new_game_user = this.getGameSession().addParticipant(member);
    this.refreshUI();
    this.getGameSession().editUI(this.lobby_ui);
    new_game_user.sendInteractionReply(interaction, { content: `\`\`\`🔸 ${this.getGameCore().getGameName()} 게임에 참가했어요.\`\`\``, ephemeral: true });

    this.getGameSession().playBGM(BGM_TYPE.JOIN);
  }

  private handleLeave(interaction: RepliableInteraction, member: GuildMember)
  {
    if(!this.getGameSession().findUser(member.id))
    {
      interaction.reply({ content: `\`\`\`🔸 ${this.getGameCore().getGameName()} 게임에 참가 중이지 않네요.\`\`\``, ephemeral: true });
      return;
    }

    if(this.checkHost(member.id))
    {
      this.getGameSession().sendMessage(`\`\`\`🔸 게임의 호스트인 ${this.getGameSession().getHost()?.displayName} 님께서 퇴장하셨어요.\n🔸 이 게임은 더 이상 유효하지 않아요.\`\`\``);
      this.getGameSession().deleteUI();
      this.getGameSession().removeParticipant(member.id);
      return;
    }

    this.getGameSession().removeParticipant(member.id);
    this.refreshUI();
    this.getGameSession().editUI(this.lobby_ui);
    interaction.reply({ content: `\`\`\`🔸 ${this.getGameCore().getGameName()} 게임에서 떠났어요.\`\`\``, ephemeral: true });
  }

  private handleRuleBook(interaction: RepliableInteraction)
  {
    const game_user = this.getGameSession().findUser(interaction.user.id);
    if(game_user)
    {
      game_user.sendInteractionReply(interaction, { content: `${this.getGameCore().getGameDescription()}`, ephemeral: true });
    }
    else
    {
      interaction.reply({ content: `${this.getGameCore().getGameDescription()}`, ephemeral: true });
    }
  }

  private handleStart(interaction: RepliableInteraction, member: GuildMember)
  {
    const game_user = this.getGameSession().findUser(interaction.user.id);
    if(!game_user)
    {
      return;
    }

    if(this.checkHost(member.id) === false)
    {
       game_user.sendInteractionReply(interaction, {
        content: `\`\`\`🔸 게임의 호스트인 ${this.getGameSession().getHost()?.displayName} 님만 게임 시작이 가능합니다.\`\`\``,
        ephemeral: true
      });
      return;
    }

    const players_count = this.getGameSession().getParticipants().length;
    if(players_count < this.getGameCore().getMinPlayers())
    {
      game_user.sendInteractionReply(interaction, { content: `\`\`\`🔸 ${this.getGameCore().getGameName()} 게임을 시작하려면 적어도 ${this.getGameCore().getMinPlayers()}명이 필요해요. 😥\`\`\``, ephemeral: true });
      return;
    }

    if(players_count > this.getGameCore().getMaxPlayers())
    {
       game_user.sendInteractionReply(interaction, {
        content: `\`\`\`🔸 ${this.getGameCore().getGameName()} 게임은 최대 ${this.getGameCore().getMaxPlayers()}명까지만 할 수 있어요.\n🔸 애초에 참가가 안될텐데 어떻게 하신거죠? 이 경우엔 게임을 다시 시작해야해요... 😥\`\`\``,
        ephemeral: true
      });
      return;
    }

    if(this.checkCanStartGame(game_user, interaction) === false)
    {
      return;
    }

    this.getGameSession().sendMessage(`\`\`\`🔸 ${this.getGameCore().getGameName()} 게임을 시작할게요! 🙂\`\`\``);

    game_user.sendInteractionReply(interaction, {
      content: `\`\`\`🔸 게임을 시작했어요.\`\`\``,
      ephemeral: true
    });

    this.getGameSession().playBGM(BGM_TYPE.GAME_START);

    this.getGameCore().gameStarted();
    this.getGameCore().getGameData().setInGameUsers(this.getGameSession().getParticipants());

    this.exit();
    this.goToNextCycle();

    deleteMessage((interaction as ButtonInteraction).message); 
  }

  private handleSetting(interaction: RepliableInteraction, member: GuildMember)
  {
    const game_user = this.getGameSession().findUser(interaction.user.id);
    if(!game_user)
    {
      return;
    }

    const game_options = this.getGameCore().getGameOptions();
    if(game_options.getOptions().length === 0)
    {
      game_user.sendInteractionReply(interaction, {
        content: `\`\`\`🔸 ${this.getGameCore().getGameName()} 게임은 설정할 수 있는 항목이 없어요.\`\`\``,
        ephemeral: true
      });
      return;
    }

    const option_type_select_menu = game_options.buildUI();

    if(this.checkHost(member.id) === false)
    {
      game_user.sendInteractionReply(interaction, {
        content: `\`\`\`🔸 참가자는 설정 확인만 가능해요.\`\`\``,
        embeds: [option_type_select_menu.embed],
        ephemeral: true
      });
    }
    else
    {
      game_user.sendInteractionReply(interaction, {
        embeds: [option_type_select_menu.embed],
        components: option_type_select_menu.components,
        ephemeral: true
      });
    }
  }

  private handleOptionTypeSelect(interaction: RepliableInteraction, member: GuildMember)
  {
    const select_interaction = interaction as SelectMenuInteraction;
    if(!select_interaction)
    {
      return;
    }

    const option_id = select_interaction.values[0];
    const option = this.getGameCore().getGameOptions().getOption(option_id);
    if(!option)
    {
      return;
    }

    const option_value_select_menu = option.buildUI();
    select_interaction.update({
      embeds: [option_value_select_menu.embed],
      components: option_value_select_menu.components,
    });
  }

  private handleOptionValueSelect(interaction: RepliableInteraction, member: GuildMember)
  {
    if(this.checkHost(member.id) === false) //???
    {
      logger.warn(`${member.id} tried to select option. but this user is not host`);
      return;
    }

    const select_interaction = interaction as SelectMenuInteraction;
    if(!select_interaction)
    {
      return;
    }

    const option_id = select_interaction.customId.split('#')[1];
    const option = this.getGameCore().getGameOptions().getOption(option_id);
    if(!option)
    {
      return;
    }

    const selected_value = select_interaction.values[0];
    option.selectChoice(selected_value);

    const option_type_select_menu = this.getGameCore().getGameOptions().buildUI();
    select_interaction.update({
      embeds: [option_type_select_menu.embed],
      components: option_type_select_menu.components,
    });

    if(select_interaction.guild)
    {
      saveGameOptionsToCache(select_interaction.guild.id, this.getGameCore().getGameId(), this.getGameCore().getGameOptions());
    }
  }

  private checkHost(user_id: string)
  {
    return this.getGameSession().getHost()?.id === user_id;
  }

  private refreshUI()
  {
    let participants_status = `\`\`\`📋 참가자 목록\n\n`;

    for(const user of this.getGameSession().getParticipants())
    {
      participants_status += `🔹 ${user.getDisplayName()}\n`;
    }
    participants_status += `\`\`\``;

    this.lobby_ui.embed.setDescription(participants_status);
  }

  protected abstract checkCanStartGame(game_user: GameUser, interaction: RepliableInteraction): boolean;
}
