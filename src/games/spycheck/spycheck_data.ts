import { ActionRowBuilder, ButtonBuilder, ButtonStyle, GuildMember, ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, TextInputBuilder, TextInputStyle, User } from "discord.js";
import { GameData } from "../common/game_data";
import { GameUI } from "../common/game_ui";
import * as fs from 'fs';
import { getLogger } from "../../utils/logger";
import { getAbsolutePath, getRandomElement, getRandomNumber, shuffleArray } from "../../utils/utility";
import { ANSWER_SELECT_CHOICES, ANSWER_SELECT_MENU, ANSWER_TYPES } from "./answer_select_type";
import path, { dirname } from "path";
import { cloneDeep } from "lodash";
const logger = getLogger('SpyCheckData');

export class Question
{
    public question_text: string;
    public answer_type: number;

    constructor(question: string, answer_type: number)
    {
        this.question_text = question;
        this.answer_type = answer_type;       
    }
}

export class SpyCheckGameData extends GameData
{
  static EXPLICIT_QUESTION_LIST: Array<Question> = SpyCheckGameData.loadExplicitQuestionList();

  static loadExplicitQuestionList()
  {
    const question_list =  Array<Question>();

    const question_list_path = getAbsolutePath(process.env.SPYCHECK_QUESTION_LIST_PATH);

    if(fs.existsSync(question_list_path) === false)
    {
      logger.error(`${question_list_path} is not exists`);
      return question_list;
    }

    const data = fs.readFileSync(question_list_path, 'utf-8'); // 파일을 읽어와 문자열로 저장
    const json = JSON.parse(data);

    json.forEach((item: { q: string; a: number; }) => {
      question_list.push(new Question(item.q, item.a));
    });

    return question_list;
  }

  constructor()
  {
    super();

    this.data_map.set('SPY_LIST', []);
    this.data_map.set('CUSTOM_QUESTION_UI_MAP', new Map<string, SpyCheckCustomQuestionUI>())
    this.data_map.set('QUESTION_LIST', Array<Question>());
    this.data_map.set('ANSWER_SELECT_MAP', new Map<string, string>());
    this.data_map.set('VOTE_MAP', new Map<string, string>());
    this.data_map.set('CURRENT_QUESTION', null);
    this.data_map.set('GAME_RESULT', 'NULL');
    this.data_map.set('SPY_LIST_STRING', '');
  }

  addSpy(user: GuildMember | User): void
  {
    this.data_map.get('SPY_LIST').push(user.id);

    const spy_list_string = this.data_map.get('SPY_LIST_STRING');
    this.data_map.set('SPY_LIST_STRING', spy_list_string + '\n' + user.displayName);
  }

  isSpy(user_id: string): boolean
  {
    return this.data_map.get('SPY_LIST').includes(user_id);
  }

  registerCustomQuestionUI(user_id: string, question_ui: SpyCheckCustomQuestionUI): void
  {
    const map = this.data_map.get('CUSTOM_QUESTION_UI_MAP');
    map.set(user_id, question_ui);
  }

  getCustomQuestionUI(user_id: string): SpyCheckCustomQuestionUI | null
  {
    const map = this.data_map.get('CUSTOM_QUESTION_UI_MAP');
    return map.get(user_id);
  }

  addQuestion(question: Question): void
  {
    this.data_map.get('QUESTION_LIST').push(question);
  }

  getQuestionList(): Array<Question>
  {
    return this.data_map.get('QUESTION_LIST');
  }

  shuffleQuestionList(): void
  {
    const shuffled_array = shuffleArray(this.getQuestionList());
    this.data_map.set('QUESTION_LIST', shuffled_array);
  }

  fillQuestionList(count: number)
  {
    const target_index_list = new Array<Question>();
    const question_list = this.getQuestionList();

    let tried_count = 0;
    for(let i = 0; i < count; ++i)
    {
      const rd_question = getRandomElement(SpyCheckGameData.EXPLICIT_QUESTION_LIST);
      if(target_index_list.includes(rd_question) && tried_count < 1000)
      {
        ++tried_count;
      }

      question_list.push(rd_question);
    }
  }

  popQuestion(): Question | null
  {
    return this.getQuestionList().pop() ?? null;
  }

  getAnswerSelectComponent(answer_type: number, users: Array<GuildMember> | null = null): ActionRowBuilder<StringSelectMenuBuilder> | null
  {
    if(answer_type === 4 && users) //참가자 선택 방식
    {
      const user_select_comp = new ActionRowBuilder<StringSelectMenuBuilder>()
      .addComponents(
        new StringSelectMenuBuilder()
        .setCustomId('answer_select')
        .setPlaceholder('답변 선택')
        .addOptions(
            users.map(user => 
            {
              return new StringSelectMenuOptionBuilder().setLabel(user.displayName).setValue(user.displayName);
            })
        )
      );

      return user_select_comp;
    }

    const comp =  ANSWER_SELECT_MENU.get(answer_type) ?? null;
    if(!comp)
    {
      logger.error(`Answer type ${answer_type} is not exist`);
    }
    return comp;
  }

  getRandomAnswer(answer_type: number, users: Array<GuildMember> | null = null)
  {
    if(answer_type === 4 && users) //참가자 선택 방식
    {
      return getRandomElement(users).displayName;
    }

    const choices = ANSWER_SELECT_CHOICES.get(answer_type) ?? null;
    if(!choices)
    {
      logger.error(`Answer type ${answer_type} is not exist`);
      return null;
    }
    else
    {
      return getRandomElement(choices);
    }

  }

  addUserAnswerSelect(user_id: string, value: string): number
  {
    const map: Map<string, string> = this.data_map.get('ANSWER_SELECT_MAP');
    map.set(user_id, value);

    return map.size;
  }

  clearAnswerSelectMap(): void
  {
    const map: Map<string, string> = this.data_map.get('ANSWER_SELECT_MAP');
    map.clear();
  }

  getAnswerSelectMap(): Map<string, string>
  {
    return this.data_map.get('ANSWER_SELECT_MAP');
  }

  addUserVoted(user_id: string, value: string): number
  {
    const map: Map<string, string> = this.data_map.get('VOTE_MAP');
    map.set(user_id, value);

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

  getVotedCount(user_id: string): number
  {
    let voted_count = 0;
    const map: Map<string, string> = this.data_map.get('VOTE_MAP');
    for(const value of map.values())
    {
      if(value === user_id)
      {
        ++voted_count;
      }
    }

    return voted_count;
  }

  setCurrentQuestion(question: Question)
  {
    this.data_map.set('CURRENT_QUESTION', question);
  }

  getCurrentQuestion()
  {
    return this.data_map.get('CURRENT_QUESTION');
  }

  setGameResult(result: string)
  {
    this.data_map.set('GAME_RESULT', result);
  }

  getGameResult(): string
  {
    return this.data_map.get('GAME_RESULT');
  }

  getSpyListString(): string
  {
    return this.data_map.get('SPY_LIST_STRING');
  }
}

export class SpyCheckCustomQuestionUI extends GameUI
{
    public selected_answer_type: number = 0;
    public custom_question_text: string = '';

    public confirmed: boolean = false;

    public write_question_modal: ModalBuilder;

    constructor()
    {
        super();

        this.embed
        .setColor(0xD92334)
        .setTitle('🖊 **[ 질문 작성 ]**')
        .setDescription(`
          스파이를 찾아내기 위한 질문을 작성해주세요!
          예시) 나는 겨울에도 아이스 아메리카노를 먹는 편이다.
        `)
    
        const custom_question_answer_type_select_menu = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`answer_type_select`)
            .setPlaceholder(`답변 선택지 설정`)
            .addOptions(
                ANSWER_TYPES.map(answer_choice => answer_choice)
            )
        )
    
        const custom_question_control_component = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
          .setCustomId('request_modal_write_question')
          .setLabel('질문 작성')
          .setStyle(ButtonStyle.Primary),
    
          new ButtonBuilder()
          .setCustomId('submit')
          .setLabel('제출')
          .setStyle(ButtonStyle.Success),
        )
    
        this.components = [custom_question_answer_type_select_menu, custom_question_control_component];

        this.write_question_modal = new ModalBuilder()
            .setCustomId('modal_submit_write_question')
            .setTitle('질문 작성')
            .addComponents(
                new ActionRowBuilder<TextInputBuilder>()
                .addComponents(
                    new TextInputBuilder()
                    .setCustomId('txt_custom_question')
                    .setLabel('질문 내용을 입력해주세요.')
                    .setStyle(TextInputStyle.Paragraph)
                    .setMaxLength(32)
                    .setRequired(true)
                    .setPlaceholder('예시) 나는 겨울에도 아이스 아메리카노를 먹는 편이다.')
                )
            )
    }

    update()
    {
        this.embed.setDescription(`🔹 질문 내용:\n${this.custom_question_text}\n\n🔹 답변 선택지: ${ANSWER_TYPES[this.selected_answer_type].data.label}`)
        this.write_question_modal.components[0].components[0].setValue(this.custom_question_text); 
    }

    confirm()
    {
        this.confirmed = true;
    }
}