import { GuildMember } from "discord.js";
import { cloneDeep } from "lodash";

/* eslint-disable @typescript-eslint/no-explicit-any */
export class GameData
{
  public data_map: Map<string, any> = new Map<string, any>();

  constructor()
  {
    this.data_map.set('INGAME_USERS', Array<GuildMember>());
  }

  setInGameUsers(users: Array<GuildMember> )
  {
    const ingame_users:Array<GuildMember> = [];
    for(const user of users)
    {
      ingame_users.push(user);
    }

    this.data_map.set('INGAME_USERS', ingame_users);
  }

  getInGameUsers(): Array<GuildMember>
  {
    return this.data_map.get('INGAME_USERS');
  }

  isInGameUsers(user_id: string): boolean
  {
    const ingame_users:Array<GuildMember> = this.data_map.get('INGAME_USERS');

    for(const user of ingame_users)
    {
      if(user.id === user_id)
      {
        return true;
      }
    }

    return false;
  }

  getDisplayName(user_id: string): string | null
  {
    const ingame_users:Array<GuildMember> = this.data_map.get('INGAME_USERS');

    for(const user of ingame_users)
    {
      if(user.id === user_id)
      {
        return user.displayName;
      }
    }

    return null;
  }

  removeInGameUser(user_id: string)
  {
    const ingame_users:Array<GuildMember> = this.data_map.get('INGAME_USERS');

    this.setInGameUsers(ingame_users.filter((user: GuildMember) => user.id !== user_id));
  }
  
  expire()
  {
    this.data_map.clear();
  }
}