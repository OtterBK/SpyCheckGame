export class GameInfo 
{
  public name: string = "";
  public min_players: number = 0;
  public max_players: number = 0;
}
  
export const GAME_INFO_MAP: Map<string, GameInfo> = new Map();
  
GAME_INFO_MAP.set('SPY_CHECK', {
  name: "스파이체크",
  min_players: 4,
  max_players: 8,
});

export function getGameInfo(game_id: string): GameInfo | null
{
  return GAME_INFO_MAP.get(game_id) ?? null;
}
  