import * as fs from 'fs';
import { getLogger } from '../../utils/logger';
import { RESOURCE_CONFIG } from '../../config/resource_config';
const logger = getLogger('GameInfo');

export class GameInfo 
{
    static GAME_INFO_MAP: Map<string, GameInfo> = loadGameInfoMap();

    public id: string;
    public name: string;
    public min_players: number;
    public max_players: number;
    public difficulty: number;
    public very_simple_description: string;
    public simple_description: string;
    public description: string;
    public thumbnail: string;

    constructor(
        id: string,
        name: string,
        min_players: number,
        max_players: number,
        difficulty: number,
        very_simple_description: string,
        simple_description: string,
        description: string,
        thumbnail: string
    ) {
        this.id = id;
        this.name = name;
        this.min_players = min_players;
        this.max_players = max_players;
        this.difficulty = difficulty;
        this.very_simple_description = very_simple_description;
        this.simple_description = simple_description;
        this.description = description;
        this.thumbnail = thumbnail;
    }
}

function loadGameInfoMap(): Map<string, GameInfo> 
{
    const map: Map<string, GameInfo> = new Map<string, GameInfo>();
    try 
    {
        const data = fs.readFileSync(RESOURCE_CONFIG.GAME_INFO_PATH, 'utf-8');
        const jsonData = JSON.parse(data);

        jsonData.forEach((game: any) => {
            const gameInfo = new GameInfo(
                game.id,
                game.name,
                game.min_players,
                game.max_players,
                game.difficulty,
                game.very_simple_description,
                game.simple_description,
                game.description,
                game.thumbnail
            );
            map.set(game.id, gameInfo);
        });
    } 
    catch (error) 
    {
        logger.error(`Error loading game info map${RESOURCE_CONFIG.GAME_INFO_PATH}: `, error);
    }

    return map;
}
