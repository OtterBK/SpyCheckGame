import { ActionRowBuilder, AttachmentBuilder, Interaction, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { GameUI } from "../../common/game_ui";
import { SPYFALL_OPTION } from "../spyfall_options";
import { SpyFallCore } from "../spyfall_core";
import { deleteMessage, sleep } from "../../../utils/utility";
import { getLogger } from "../../../utils/logger";
import { BGM_TYPE } from "../../../managers/bgm_manager";
import { SpyFallCycle } from "../spyfall_cycle";
import { GameUser } from "../../common/game_user";
import { RESOURCE_CONFIG } from "../../../config/resource_config";
import { Place, Role, SpyFallGameData } from "../spyfall_data";
const logger = getLogger('SpyFallStart');

export class StartCycle extends SpyFallCycle
{
  constructor(game_core: SpyFallCore)
  {
    super(game_core, `SpyFallStart`);
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
      .setTitle('장소 및 역할 선택 중...');

    this.getGameSession().sendUI(spy_choosing_alert_ui);

    await sleep(3000); //그냥 3초 대기
      
    //스파이 선정
    this.pickRandomSpy();
    
    //장소 선정
    const is_extend_mode = this.getOption(SPYFALL_OPTION.EXTEND_MODE_ENABLE).getSelectedValueAsBoolean();
    const place = this.getGameData().getRandomPlace(is_extend_mode);
    this.getGameData().setCurrentPlace(place);

    //역할 분배
    this.pickRandomRole(place);

    await sleep(2000); //그냥 2초 대기

    return true;
  }

  async exit(): Promise<boolean>
  {
    return true;
  }

  onInteractionCreated(interaction: Interaction): void 
  {

  }

  pickRandomSpy()
  {
    let spy_candidates: Array<GameUser> = [];
    for(const participant of this.getGameData().getInGameUsers())
    {
      spy_candidates.push(participant);
    }

    const spy_count = this.getOption(SPYFALL_OPTION.SPY_COUNT).getSelectedValueAsNumber();
    for(let i = 0; i < spy_count && spy_candidates.length > 0; ++i)
    {
      const random_index = Math.floor(Math.random() * spy_candidates.length);
      const spy = spy_candidates.splice(random_index, 1)[0];
      this.getGameData().addSpy(spy);
    }
  }

  pickRandomRole(place: Place)
  {
    place.shuffleRoles();

    const is_extend_mode = this.getOption(SPYFALL_OPTION.EXTEND_MODE_ENABLE).getSelectedValueAsBoolean();
    const spy_count = this.getOption(SPYFALL_OPTION.SPY_COUNT).getSelectedValueAsNumber();
    let spy_image_number = 0;
    for(const game_user of this.getGameData().getInGameUsers())
    {
      const role = place.getRandomRole();
      if(!role)
      {
        this.getGameSession().sendMessage(`\`\`\`🚫 역할을 배정하는 중 문제가 발생했습니다....\n게임이 강제 종료됩니다.\`\`\``);
        this.getGameSession().forceStop(`Failed to allocate role to someone. user count: ${this.getGameData().getInGameUserCount()}. place_name: ${place.getName()}`);
        return false;
      }

      const role_ui = new GameUI();
      role_ui.embed.setTitle(`🃏 **[ 역할표 ]**`)

      if(this.getGameData().isSpy(game_user))
      {
        ++spy_image_number;

        this.getGameData().setRole(game_user, new Role('스파이', 'LOCAL'));

        role_ui.embed
        .setColor(0xC20000)
        .setDescription(`\n
          🍀 장소: 스파이는 장소를 몰라요.\n
          🎬 역할: **스파이**\n
          🐱‍👤 스파이 목록:${this.getGameData().getSpyListString()}
        \n`)
        .setImage(`attachment://thumbnail.png`);
        if(spy_count > 1) //스파이가 복수면
        {
          role_ui.embed.setFooter({text: `🔹 동료 스파이와 협력하여 장소가 어딘지 추측하세요!`})
        }
        else
        {
          role_ui.embed.setFooter({text: `🔹 장소가 어딘지 추측하세요!`})
        }

        role_ui.files.push(
          new AttachmentBuilder(`${RESOURCE_CONFIG.SPYFALL_PATH}/thumbnails/스파이${spy_image_number}.png`, {
            name: `thumbnail.png`
          }));

        role_ui.components = this.getGameData().buildPlaceSelectComponents(is_extend_mode);
      }
      else
      {
        this.getGameData().setRole(game_user, role);

        role_ui.embed
        .setColor(0x106AA9)
        .setDescription(`\n
          🍀 장소: **${place.getName()}**\n
          🎬 역할: **${role.getName()}**\n
        \n`)
        .setImage(`attachment://thumbnail.png`)
        
        role_ui.files.push(
          new AttachmentBuilder(`${RESOURCE_CONFIG.SPYFALL_PATH}/thumbnails/${place.getName()}.png`, {
            name: `thumbnail.png`
          }
        ));
      }

      game_user.sendPrivateUI(role_ui);
    }

  }

}