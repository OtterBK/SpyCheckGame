const env_base_path = process.cwd();

export const RESOURCE_CONFIG =
{
    GAME_INFO_PATH: `${env_base_path}/resources/boardgame_info.json`,
    BGM_PATH: `${env_base_path}/resources/bgm/`, //BGM 파일 위치
    FEEDBACK_PATH: `${env_base_path}/resources/feedback.txt`,
    SPYCHECK_PATH: `${env_base_path}/resources/spycheck/`, 
    SPYFALL_PATH: `${env_base_path}/resources/spyfall/`
}