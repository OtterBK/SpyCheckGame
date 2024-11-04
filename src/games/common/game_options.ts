import { ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import { GameUI } from "./game_ui";
import { getLogger } from "../../utils/logger";
const logger = getLogger('GameOptions');

export class GameOptions
{
  private options: Array<GameOption> = [];

  getOptions()
  {
    return this.options;
  }

  addOption(options: GameOption)
  {
    this.options.push(options);
  }

  setOptionValue(option_id: string, choice_value: string)
  {
    const option = this.getOption(option_id);
    if(option)
    {
      option.selectChoice(choice_value);
    }
  }

  getOption(option_id: string): GameOption
  {
    for(const option of this.options)
    {
      if(option.getOptionId() === option_id)
      {
        return option;
      }
    }

    throw new Error(`${option_id} does exist`);
  }

  buildUI(): GameUI
  {
    const ui = new GameUI();
    ui.embed
      .setColor(0x318F23)
      .setTitle(`**🛠 [ 설정할 항목 선택 ]**`);

    let option_status = '\n';
    for(const option of this.options)
    {
      const selected_choice_value = option.getSelectedChoice()?.name;
      option_status += `🔧 ${option.getOptionName()}:\n🔹 ${selected_choice_value}\n\n`;
    }
    ui.embed.setDescription(`${option_status}`);
    ui.embed.setFooter({text: '설정 값은 봇이 재시작 될 때까지 유효해요.'});

    const option_type_select_menu = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('option_type_select')
          .setPlaceholder(`어떤 항목을 설정할까요?`)
          .addOptions(
            this.options.map(option =>
            {
              return { label: option.getOptionName(), description: option.getDescription(), value: option.getOptionId() };
            })
          )
      );

    ui.components.push(option_type_select_menu);

    return ui;
  }
}

export class GameOption
{
  private name: string;
  private id: string;
  private description: string;
  private choices: Array<OptionChoice> = [];

  private selected_choice_index = 0;

  constructor(name: string, id: string, description: string)
  {
    this.name = name;
    this.id = id;
    this.description = description;
  }

  addChoice(choice: OptionChoice): GameOption
  {
    if(this.choices.length > 25)
    {
      throw new Error("Option Choices must be at least 25");
    }

    if(this.findChoiceByValue(choice.value))
    {
      throw new Error(`Duplicate choice value. ${choice.name}/${choice.value}/${choice.description}`);
    }

    this.choices.push(choice);
    return this;
  }

  findChoiceByValue(value: string): OptionChoice | null
  {
    for(const choice of this.choices)
    {
      if(choice.value === value)
      {
        return choice;
      }
    }

    return null;
  }

  getOptionName()
  {
    return this.name;
  }

  getOptionId()
  {
    return this.id;
  }

  getSelectedValue(): string
  {
    const selected_choice = this.getSelectedChoice();
    if(!selected_choice)
    {
      throw new Error(`${this.id} does not have selected choice`);
    }

    return selected_choice.value;
  }

  getSelectedValueAsNumber(): number
  {
    return parseInt(this.getSelectedValue(), 10);
  }

  getSelectedValueAsBoolean(): boolean
  {
    return this.getSelectedValue() === 'true' ? true : false;
  }

  getDescription()
  {
    return this.description;
  }

  getChoices()
  {
    return this.choices;
  }

  getSelectedChoice(): OptionChoice | null
  {
    return this.choices[this.selected_choice_index];
  }

  selectChoice(choice_value: string): GameOption
  {
    const selected_choice = this.findChoiceByValue(choice_value);
    if(!selected_choice)
    {
      throw new Error(`The option ${this.id} does not have ${choice_value}`);
    }

    for(let i = 0; i < this.choices.length; ++i)
    {
      if(this.choices[i] === selected_choice)
      {
        this.selected_choice_index = i;
        return this;
      }
    }

    logger.warn(`The option ${this.id} does not have selected choice`);
    return this;
  }

  buildUI(): GameUI
  {
    const ui = new GameUI();
    ui.embed
      .setColor(0x318F23)
      .setTitle(`**🛠 [ ${this.getOptionName()} ]**`);
    
    let option_status = `📑 설정 설명: ${this.getDescription()}\n🔹 설정된 값: ${this.getSelectedChoice()?.name}\n`;
    ui.embed.setDescription(option_status);
    
    const option_value_select_menu = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`option_value_select#${this.id}`)
          .setPlaceholder(`어떤 값으로 설정할까요?`)
          .addOptions(
            this.choices.map(choice =>
            {
              return { label: choice.name, description: choice.description, value: choice.value };
            })
          )
      );
    
    ui.components.push(option_value_select_menu);
    
    return ui;
  }
}

export class OptionChoice
{
  public name: string;
  public value: string;
  public description: string;

  constructor(name: string, value: string, description: string)
  {
    this.name = name;
    this.value = value;
    this.description = description;
  }
}