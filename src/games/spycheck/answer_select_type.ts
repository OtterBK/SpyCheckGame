import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";

export const ANSWER_TYPES: Array<StringSelectMenuOptionBuilder> = [
    new StringSelectMenuOptionBuilder()
    .setLabel('동의 / 중립 / 반대')
    .setValue('0'),
  
    new StringSelectMenuOptionBuilder()
    .setLabel('매우 그렇다 / 그렇다 / 보통이다 / 그렇지 않다 / 전혀 그렇지 않다')
    .setValue('1'),
  
    new StringSelectMenuOptionBuilder()
    .setLabel('언제나 / 때때로 / 절대 아님')
    .setValue('2'),
  
    new StringSelectMenuOptionBuilder()
    .setLabel('예 / 아니오')
    .setValue('3'),
  
    new StringSelectMenuOptionBuilder()
    .setLabel('참가자 중 1명을 선택')
    .setValue('4'),
  ];
  

export const ANSWER_SELECT_CHOICES = new Map<number, Array<string>>([
    [0, ['동의', '중립', '반대']],
    [1, ['매우 그렇다', '그렇다', '보통이다', '그렇지 않다', '전혀 그렇지 않다']],
    [2, ['언제나', '때때로', '전혀 안 함']],
    [3, ['예', '아니오']],
    [4, ['ERROR']],
]);

export const ANSWER_SELECT_MENU: Map<number, ActionRowBuilder<StringSelectMenuBuilder>> = new Map();

ANSWER_SELECT_CHOICES.forEach((choices, key) => {
    const actionRow = new ActionRowBuilder<StringSelectMenuBuilder>()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('answer_select')
                .setPlaceholder('답변 선택')
                .addOptions(
                    ...choices.map(choice => 
                        new StringSelectMenuOptionBuilder()
                            .setLabel(choice)
                            .setValue(choice)
                    )
                )
        );

    ANSWER_SELECT_MENU.set(key, actionRow);
});
