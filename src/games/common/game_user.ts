import { GuildMember, RepliableInteraction, ActionRowBuilder, ButtonBuilder, ButtonStyle, Interaction, InteractionReplyOptions } from "discord.js";
import { GameUI } from "./game_ui";
import { getLogger } from "../../utils/logger";
const logger = getLogger('GameUser');

export const interaction_refresh_ui = new GameUI();
interaction_refresh_ui.embed
.setColor(0xFF7F00)
.setTitle('❗ **[ 자리 비움 알림 ]**')
.setDescription('🔸 장시간 응답이 없어서 개인 화면이 곧 만료돼요.\n🔸 아래의 새로고침 버튼을 눌러서 개인 화면을 갱신해주세요!')

interaction_refresh_ui.components.push(
    new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder().setCustomId('refresh_private_menu').setLabel('새로고침').setStyle(ButtonStyle.Success),
    )
);

const interaction_expired_alert_ui = new GameUI();
        interaction_expired_alert_ui.embed
        .setColor(0xFF7F00)
        .setTitle('🚫 **[ UI 만료 알림 ]**')
        .setDescription(`🔸 장시간 응답이 없어서 개인 화면이 만료됐어요.\n🔸 **'/새로고침'** 명령어로 언제든 개인 화면을 다시 불러올 수 있어요!`)

export class GameUser
{
    static INTERACTION_TIMEOUT: number = 14 * 60 * 1000; //14분(원래 15분까지 follow up이 가능한데 1분은 여유타임)

    private user: GuildMember;
    private interaction: RepliableInteraction | null = null;
    private interaction_created_time: number = 0;

    private refresh_alert_timer: NodeJS.Timeout | null = null;
    private timer_count:number = 0;

    private current_private_ui: GameUI | null = null;

    private expired: boolean = false;

    constructor(user: GuildMember, interaction: RepliableInteraction | null = null)
    {
        this.user = user;
        this.updateInteraction(interaction);
    }

    getUser(): GuildMember
    {
        return this.user;
    }

    getId(): string
    {
        return this.user.id;
    }

    getDisplayName(): string
    {
        return this.user.displayName;
    }

    sendDirectMessage(content: string): void
    {
        this.user.send(content);
    }

    sendDirectUI(ui: GameUI): void
    {
        this.user.send(
            {
                embeds: [ui.embed],
                components: ui.components,
            }
        )
    }

    async sendPrivateUI(ui: GameUI | null)
    {
        if(!ui)
        {
            return false;
        }

        if(ui !== interaction_refresh_ui)
        {
            this.current_private_ui = ui;
        }

        if(this.isInteractionValid() === false)
        { 
            this.sendDirectUI(interaction_expired_alert_ui);
            return false;
        }

        this.interaction!.followUp(
            {
                embeds: [ui.embed],
                components: ui.components,
                ephemeral: true
            }
        ).then(() => 
        {
            return;
        })
        .catch(err => {
            logger.error(`Cannot send private ui err: ${err.message}. user_id: ${this.getId()}`);
        });

        return true;
    }

    async sendPrivateMessage(content: string)
    {
        if(this.isInteractionValid() === false)
        { 
            this.sendDirectUI(interaction_expired_alert_ui);
            return false;
        }

        this.interaction!.followUp(
            {
                content: content,
                ephemeral: true
            }
        )
        .then(() => 
        {
            return;
        })
        .catch(err => {
            logger.error(`Cannot send private message err: ${err.message}. user_id: ${this.getId()}`);
        });

        return true;
    }

    sendInteractionReply(interaction: Interaction, replyOptions: InteractionReplyOptions): Promise<void> | null
    {
        if (!interaction.isRepliable())
        {
            logger.error(`Cannot reply to interaction. do not update interaction. ${interaction.type}. user_id: ${this.getId()}`);
            return null;
        }
    
        return interaction.reply(replyOptions)
        .then(() => 
        {
            this.updateInteraction(interaction);
        })
        .catch(err => {
            logger.error(`Cannot reply interaction. do not update interaction. err: ${err.message}. user_id: ${this.getId()}`);
        });         
    }

    sendInteractionDeferReply(interaction: Interaction): Promise<void> | null
    {
        if (!interaction.isRepliable())
        {
            logger.error(`Cannot defer reply to interaction. do not update interaction. ${interaction.type}. user_id: ${this.getId()}`);
            return null;
        }

        return interaction.deferReply()
        .then(() => 
        {
            this.updateInteraction(interaction);
        })
        .catch(err => {
            logger.error(`Cannot defer reply interaction. do not update interaction. err: ${err.message}. user_id: ${this.getId()}`);
        }); 
    }

    getCurrentPrivateUI()
    {
        return this.current_private_ui;
    }

    updateInteraction(interaction: RepliableInteraction | null): boolean
    {
        if(this.expired)
        {
            return false;
        }

        if(!interaction || !interaction.isRepliable())
        {
            return false;
        }

        const repliable_interaction = interaction as RepliableInteraction;
        if(!repliable_interaction)
        {
            return false;
        }

        this.interaction = repliable_interaction;
        this.interaction_created_time = Date.now();

        this.startRefreshAlertTimer();

        return true;
    }

    private startRefreshAlertTimer()
    {
        if(this.refresh_alert_timer) //기존에 돌아가던거 있으면 초기화
        {
            clearInterval(this.refresh_alert_timer);
        }

        this.timer_count = 0;

        this.refresh_alert_timer = setInterval(() => 
        {  
            ++this.timer_count;
            if(this.timer_count >= 15) //15분 경과?
            {
                if(this.refresh_alert_timer)
                {
                    clearInterval(this.refresh_alert_timer);
                }
                this.sendDirectUI(interaction_expired_alert_ui);
            }
            else if(this.timer_count >= 10) //10분 경과?
            {
                this.sendPrivateUI(interaction_refresh_ui);
            }
            
        }, 60000);
    }


    isInteractionValid()
    {
        if(!this.interaction)
        {
            return false;
        }

        if(Date.now() - this.interaction_created_time > GameUser.INTERACTION_TIMEOUT) //유효시간 지났으면
        {
            return false;
        }

        return true;
    }

    expire()
    {
        this.expired = true;

        this.interaction = null;
        this.timer_count = 99;

        logger.info(`Expiring Game User. user_id: ${this.user.id}`);


        if(this.refresh_alert_timer) //기존에 돌아가던거 있으면 초기화
        {
            clearInterval(this.refresh_alert_timer);
        }
    }
}