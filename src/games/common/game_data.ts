import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { GameUser } from "./game_user";

/* eslint-disable @typescript-eslint/no-explicit-any */
export class GameData
{
  public data_map: Map<string, any> = new Map<string, any>();

  constructor()
  {
    this.data_map.set('INGAME_USERS', Array<GameUser>());
    this.data_map.set('VOTE_MAP', new Map<string, string>());
    this.data_map.set('VOTED_COUNT_MAP', new Map<number, Array<GameUser>>);
  }

  setInGameUsers(game_users: Array<GameUser> )
  {
    const ingame_users:Array<GameUser> = [];
    for(const game_user of game_users)
    {
      ingame_users.push(game_user);
    }

    this.data_map.set('INGAME_USERS', ingame_users);
  }

  getInGameUsers(): Array<GameUser>
  {
    return this.data_map.get('INGAME_USERS');
  }

  getInGameUserCount(): number
  {
    return this.data_map.get('INGAME_USERS').length;
  }

  isInGameUser(user_id: string): boolean
  {
    const ingame_users:Array<GameUser> = this.data_map.get('INGAME_USERS');

    for(const game_user of ingame_users)
    {
      if(game_user.getId() === user_id)
      {
        return true;
      }
    }

    return false;
  }

  findUser(user_id: string): GameUser | null
  {
    const ingame_users:Array<GameUser> = this.data_map.get('INGAME_USERS');

    for(const game_user of ingame_users)
    {
      if(game_user.getId() === user_id)
      {
        return game_user;
      }
    }

    return null;
  }

  getDisplayName(user_id: string): string | null
  {
    const ingame_users:Array<GameUser> = this.data_map.get('INGAME_USERS');

    for(const game_user of ingame_users)
    {
      if(game_user.getId() === user_id)
      {
        return game_user.getDisplayName();
      }
    }

    return null;
  }

  removeInGameUser(user_id: string)
  {
    const ingame_users:Array<GameUser> = this.data_map.get('INGAME_USERS');

    this.setInGameUsers(ingame_users.filter((game_user: GameUser) => {
      if(game_user.getId() === user_id)
      {
        game_user.expire();
      }

      return game_user.getId() !== user_id;
    }));
  }
  
  expire()
  {
    this.data_map.clear();
  }

  addUserVoted(game_user: GameUser, value: string): number
  {
    const vote_map: Map<string, string> = this.data_map.get('VOTE_MAP');
    vote_map.set(game_user.getId(), value);

    return vote_map.size;
  }

  clearVoteMap()
  {
    const vote_map: Map<string, string> = this.data_map.get('VOTE_MAP');
    const voted_count_map: Map<Number, Array<GameUser>> = this.data_map.get('VOTED_COUNT_MAP');
    vote_map?.clear();
    voted_count_map?.clear();
  }

  getVoteMap(): Map<string, string>
  {
    const vote_map: Map<string, string> = this.data_map.get('VOTE_MAP');
    return vote_map;
  }

  makeVotedCountMap() // 투표 개봉
  {
    const voted_count_map: Map<number, Array<GameUser>> = this.data_map.get('VOTED_COUNT_MAP');
    for(const game_user of this.getInGameUsers())
    {
      const voted_count = this.getVotedCount(game_user);
      const user_arr = voted_count_map.get(voted_count);
      if(user_arr)
      {
        user_arr.push(game_user);
      }
      else
      {
        voted_count_map.set(voted_count, [ game_user ]);
      }
    }

    // voted_count_map의 키를 내림차순으로 정렬
    const sorted_map = new Map(
      [...voted_count_map.entries()].sort((a, b) => b[0] - a[0])
    );

    this.data_map.set('VOTED_COUNT_MAP', sorted_map);

    return sorted_map;
  }  

  getVotedCount(game_user: GameUser): number
  {
    let voted_count = 0;
    const vote_map: Map<string, string> = this.data_map.get('VOTE_MAP');
    for(const value of vote_map.values())
    {
      if(value === game_user.getId())
      {
        ++voted_count;
      }
    }

    return voted_count;
  }

  getVotedCountMap(): Map<number, Array<GameUser>>
  {
    return this.data_map.get('VOTED_COUNT_MAP');
  }

  getUserSelectComponents(id: string, placeholder: string = '의심스러운 플레이어 지목하기')
  {
    const user_select_comp = new ActionRowBuilder<StringSelectMenuBuilder>()
    .addComponents(
      new StringSelectMenuBuilder()
      .setCustomId(id)
      .setPlaceholder(placeholder)
      .addOptions(
          this.getInGameUsers().map(game_user => 
          {
            return new StringSelectMenuOptionBuilder().setLabel(game_user.getDisplayName()).setValue(game_user.getId());
          })
      )
    );

    return user_select_comp;
  }
}