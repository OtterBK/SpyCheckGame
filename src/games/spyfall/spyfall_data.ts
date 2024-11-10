import { GameData } from "../common/game_data";
import * as fs from 'fs';
import { getLogger } from "../../utils/logger";
import { getRandomElement, shuffleArray } from "../../utils/utility";
import { GameUser } from "../common/game_user";
import { cloneDeep } from "lodash";
import { RESOURCE_CONFIG } from "../../config/resource_config";
import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
const logger = getLogger('SpyFallData');

enum PLACE_TYPE
{
  NORMAL,
  EXTEND
}

export enum GAME_RESULT_TYPE
{
  SPY_WIN,
  CIVILIAN_WIN,
  CONTINUE,
}

export class Place
{
  private name: string;
  private thumbnail: string;
  private type: PLACE_TYPE;

  private roles: Array<Role> = [];

  constructor(place_name: string, thumbnail: string = "", place_type: PLACE_TYPE = PLACE_TYPE.NORMAL)
  {
    this.name = place_name;
    this.thumbnail = thumbnail;
    this.type = place_type;
  }

  addRole(role: Role)
  {
    this.roles.push(role);
  }

  shuffleRoles()
  {
    shuffleArray(this.roles);
  }

  getRandomRole()
  {
    return this.roles.pop();
  }

  getName()
  {
    return this.name;
  }

  getThumbnail()
  {
    return this.thumbnail;
  }

  getPlaceType()
  {
    return this.type;
  }

  copy(): Place
  {
    return cloneDeep(this);
  }
}

export class Role
{
  private name: string;
  private thumbnail: string;

  constructor(name: string, thumbnail: string)
  {
    this.name = name;
    this.thumbnail = thumbnail;
  }

  getName()
  {
    return this.name;
  }

  getThumbnail()
  {
    return this.thumbnail;
  }
}

export class SpyFallGameData extends GameData
{
  static PLACE_LIST_MAP: Map<PLACE_TYPE, Array<Place>> = SpyFallGameData.loadPlaceList();

  static loadPlaceList(): Map<PLACE_TYPE, Array<Place>>
  {
    const place_list_map = new Map<PLACE_TYPE, Array<Place>>();
    
    const place_list_path = RESOURCE_CONFIG.SPYFALL_PATH + "/place_list.json";
    
    if(fs.existsSync(place_list_path) === false)
    {
      logger.error(`${place_list_path} is not exists`);
      return place_list_map;
    }
      
    const data = fs.readFileSync(place_list_path, 'utf-8'); // 파일을 읽어와 문자열로 저장
    const json = JSON.parse(data);
    
    const normal_place_list = this.parsePlaceList(json.normal, PLACE_TYPE.NORMAL);
    const extend_place_list = this.parsePlaceList(json.extend, PLACE_TYPE.EXTEND);

    place_list_map.set(PLACE_TYPE.NORMAL, normal_place_list);
    place_list_map.set(PLACE_TYPE.EXTEND, extend_place_list);

    return place_list_map;
  }

  buildPlaceSelectComponents(is_extend_mode: boolean): Array<ActionRowBuilder<StringSelectMenuBuilder>>
  {
    const components: Array<ActionRowBuilder<StringSelectMenuBuilder>> = [];

    let current_select_menu: StringSelectMenuBuilder | null = null;
    let menu_num = 0;
    let place_num = 0;

    const target_place_list = is_extend_mode ? Array.from(SpyFallGameData.PLACE_LIST_MAP.values()).flat() : Array.from(SpyFallGameData.PLACE_LIST_MAP.get(PLACE_TYPE.NORMAL) ?? []);

    for(const place of target_place_list)
    {
      if(place_num++ % 25 === 0)
      {
        current_select_menu = new StringSelectMenuBuilder()
        .setCustomId(`guess_place#${menu_num++}`)
        .setPlaceholder('의심되는 장소 선택');
        
        components.push(
          new ActionRowBuilder<StringSelectMenuBuilder>()
         .addComponents(current_select_menu)
        );
      }
    
      current_select_menu!
      .addOptions(
        new StringSelectMenuOptionBuilder()
        .setEmoji('🔸')
        .setLabel(place.getName())
        .setValue(place.getName())
      );
    }

    return components;
  }

  static parsePlaceList(json_arr: Array<any>, place_type: PLACE_TYPE): Array<Place>
  {
    const place_list: Array<Place> = [];

    json_arr.forEach((item: { 
      place: any; 
      roles: Array<any>; 
    }) => 
    {
      const place = new Place(item.place.name, item.place.image, place_type);

      item.roles.forEach((role_item: {
        name: string; 
        image: string;
      }) =>
      {
        const role = new Role(role_item.name, role_item.image);
        place.addRole(role);
      });

      place_list.push(place);
    });

    return place_list;
  }

  constructor()
  {
    super();

    this.data_map.set('SPY_LIST', []);
    this.data_map.set('SPY_LIST_STRING', '');
    this.data_map.set('CURRENT_PLACE', null);
    this.data_map.set('ROLE_MAP', new Map<string, Role>());
    this.data_map.set('GAME_RESULT', GAME_RESULT_TYPE.CONTINUE);
  }

  addSpy(game_user: GameUser): void
  {
    this.data_map.get('SPY_LIST').push(game_user.getId());

    const spy_list_string = this.data_map.get('SPY_LIST_STRING');
    this.data_map.set('SPY_LIST_STRING', spy_list_string + '\n' + game_user.getDisplayName());
  }

  isSpy(game_user: GameUser): boolean
  {
    return this.data_map.get('SPY_LIST').includes(game_user.getId());
  }

  getSpyRemainedCount(): number
  {
    let spy_remained_count = 0;
    for(const game_user of this.getInGameUsers())    
    {
      if(this.isSpy(game_user))
      {
        ++spy_remained_count;
      }
    }

    return spy_remained_count;
  }

  getRandomPlace(is_extend_mode: boolean): Place
  {
    if(is_extend_mode) //확장모드?
    {
      return getRandomElement(Array.from(SpyFallGameData.PLACE_LIST_MAP.values()).flat()).copy(); //전체에서 꺼냄
    }

    return getRandomElement(Array.from(SpyFallGameData.PLACE_LIST_MAP.get(PLACE_TYPE.NORMAL) ?? [])).copy();
  }

  setCurrentPlace(place: Place)
  {
    this.data_map.set('CURRENT_PLACE', place);
  }

  getCurrentPlace(): Place
  {
    return this.data_map.get('CURRENT_PLACE');
  }

  getSpyListString(): string
  {
    return this.data_map.get('SPY_LIST_STRING');
  }

  setRole(game_user: GameUser, role: Role)
  {
    const role_map = this.data_map.get('ROLE_MAP');
    role_map.set(game_user.getId(), role);
  }

  getRole(game_user: GameUser): Role | null
  {
    return this.data_map.get('ROLE_MAP').get(game_user.getId()) ?? null;
  }

  setGameResult(result: GAME_RESULT_TYPE)
  {
    this.data_map.set('GAME_RESULT', result);
  }

  getGameResult(): GAME_RESULT_TYPE
  {
    return this.data_map.get('GAME_RESULT');
  }

}