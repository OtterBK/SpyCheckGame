import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle, User } from "discord.js";
import { GameData } from "../common/game_data";
import { GameUI } from "../common/game_ui";
import * as fs from 'fs';
import { getLogger } from "../../utils/logger";
import { getRandomElement, shuffleArray } from "../../utils/utility";
import { GameUser } from "../common/game_user";
import { cloneDeep } from "lodash";
import { RESOURCE_CONFIG } from "../../config/resource_config";
const logger = getLogger('SpyFallData');

enum PLACE_TYPE
{
  NORMAL,
  EXTEND
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
    
    const normal_place_list = this.parsePlaceList(json.get('normal'), PLACE_TYPE.NORMAL);
    const extend_place_list = this.parsePlaceList(json.get('extend'), PLACE_TYPE.EXTEND);

    place_list_map.set(PLACE_TYPE.NORMAL, normal_place_list);
    place_list_map.set(PLACE_TYPE.EXTEND, extend_place_list);

    return place_list_map;
  }

  static parsePlaceList(json_arr: Array<any>, place_type: PLACE_TYPE): Array<Place>
  {
    const place_list: Array<Place> = [];

    json_arr.forEach((item: { 
      name: string; 
      thumbnail: string; 
      roles: Array<any>; 
    }) => 
    {
      const place = new Place(item.name, item.thumbnail, place_type);

      item.roles.forEach((role_item: {
        name: string; 
        thumbnail: string;
      }) =>
      {
        const role = new Role(role_item.name, role_item.thumbnail);
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
    this.data_map.set('VOTE_MAP', new Map<string, string>());
    this.data_map.set('CURRENT_PLACE', null);
    this.data_map.set('ROLE_MAP', 'NULL');
    this.data_map.set('SPY_LIST_STRING', '');
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

  getRandomPlace(is_extend_mode: boolean): Place
  {
    if(is_extend_mode) //확장모드?
    {
      return getRandomElement(Array.from(SpyFallGameData.PLACE_LIST_MAP.values()).flat()).copy(); //전체에서 꺼냄
    }

    return getRandomElement(Array.from(SpyFallGameData.PLACE_LIST_MAP.get(PLACE_TYPE.NORMAL) ?? [])).copy();
  }

  addUserVoted(game_user: GameUser, value: string): number
  {
    const map: Map<string, string> = this.data_map.get('VOTE_MAP');
    map.set(game_user.getId(), value);

    return map.size;
  }

  clearVoteMap()
  {
    const map: Map<string, string> = this.data_map.get('VOTE_MAP');
    map.clear();
  }

  getVoteMap(): Map<string, string>
  {
    return this.data_map.get('VOTE_MAP');
  }

  getVotedCount(game_user: GameUser): number
  {
    let voted_count = 0;
    const map: Map<string, string> = this.data_map.get('VOTE_MAP');
    for(const value of map.values())
    {
      if(value === game_user.getId())
      {
        ++voted_count;
      }
    }

    return voted_count;
  }

  setCurrentPlace(place: Place)
  {
    this.data_map.set('CURRENT_PLACE', place);
  }

  getCurrentPlace()
  {
    return this.data_map.get('CURRENT_PLACE');
  }

  getSpyListString(): string
  {
    return this.data_map.get('SPY_LIST_STRING');
  }
}