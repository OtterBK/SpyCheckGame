import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, GuildMember, Interaction } from "discord.js";
import { GameCycle, LobbyCycleTemplate } from "../common/game_cycle";
import { GameUI } from "../common/game_ui";
import { GameCore } from "../common/game_core";

export class LobbyCycle extends LobbyCycleTemplate
{
  constructor(game_core: GameCore)
  {
    super(game_core, `SpyCheckLobby`);

    this.setGameTitle('스파이체크');
    this.setGameThumbnail('https://github.com/user-attachments/assets/8a935076-e098-4f46-b35c-493dd0277f83');
  }

  getGameRuleDescription(): string 
  {
    return '게임 설명';
  }
}

export class StartCycle extends GameCycle
{
  constructor(game_core: GameCore)
  {
    super(game_core, `SpyCheckStart`);
  }

  enter(): boolean 
  {
    throw new Error("Method not implemented.");
  }
  act(): boolean 
  {
    throw new Error("Method not implemented.");
  }
  exit(): boolean 
  {
    throw new Error("Method not implemented.");
  }

  onInteractionCreated(interaction: Interaction): void 
  {
    const id = interaction.id;
    
  }


}

export class PrepareRoundCycle extends GameCycle
{
  constructor(game_core: GameCore)
  {
    super(game_core, `SpyCheckPrepareRound`);
  }

  enter(): boolean 
  {
    throw new Error("Method not implemented.");
  }

  act(): boolean 
  {
    throw new Error("Method not implemented.");
  }

  exit(): boolean 
  {
    throw new Error("Method not implemented.");
  }

  onInteractionCreated(interaction: Interaction): void 
  {
    const id = interaction.id;
    
  }

}

export class ProcessRoundCycle extends GameCycle
{
  constructor(game_core: GameCore)
  {
    super(game_core, `SpyCheckProcessRound`);
  }

  enter(): boolean 
  {
    throw new Error("Method not implemented.");
  }

  act(): boolean 
  {
    throw new Error("Method not implemented.");
  }

  exit(): boolean 
  {
    throw new Error("Method not implemented.");
  }

  onInteractionCreated(interaction: Interaction): void 
  {
    const id = interaction.id;
    
  }

}

export class ClearRoundCycle extends GameCycle
{
  constructor(game_core: GameCore)
  {
    super(game_core, `SpyCheckClearRound`);
  }

  enter(): boolean 
  {
    throw new Error("Method not implemented.");
  }

  act(): boolean 
  {
    throw new Error("Method not implemented.");
  }

  exit(): boolean 
  {
    throw new Error("Method not implemented.");
  }

  onInteractionCreated(interaction: Interaction): void 
  {
    const id = interaction.id;
    
  }

}

export class EndingCycle extends GameCycle
{
  constructor(game_core: GameCore)
  {
    super(game_core, `SpyCheckEnding`);
  }

  enter(): boolean 
  {
    throw new Error("Method not implemented.");
  }
  act(): boolean 
  {
    throw new Error("Method not implemented.");
  }
  exit(): boolean 
  {
    throw new Error("Method not implemented.");
  }

  onInteractionCreated(interaction: Interaction): void 
  {
    const id = interaction.id;
    
  }

}

export class ExpireCycle extends GameCycle
{
  constructor(game_core: GameCore)
  {
    super(game_core, `SpyCheckExipre`);
  }

  enter(): boolean 
  {
    throw new Error("Method not implemented.");
  }
  act(): boolean 
  {
    throw new Error("Method not implemented.");
  }
  exit(): boolean 
  {
    throw new Error("Method not implemented.");
  }

  onInteractionCreated(interaction: Interaction): void 
  {
    const id = interaction.id;
    
  }


}