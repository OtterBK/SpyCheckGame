import { ActionRowBuilder, AnyComponent, AnyComponentBuilder, ButtonBuilder, Component, EmbedBuilder, SelectMenuBuilder } from "discord.js";

export class GameUI
{
  public embed: EmbedBuilder = new EmbedBuilder();
  public components: Array<ActionRowBuilder<ButtonBuilder | SelectMenuBuilder>> = [];
}