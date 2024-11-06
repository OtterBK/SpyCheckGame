import { Guild, Interaction, Message, TextChannel, VoiceChannel } from "discord.js";
import { VoiceConnection, joinVoiceChannel, VoiceConnectionStatus, entersState, VoiceConnectionState, DiscordGatewayAdapterCreator } from "@discordjs/voice";
import { GameSession } from "./game_session";
import { getLogger as createLogger } from "../../utils/logger";
import { destroyVoiceConnect } from "../../utils/utility";
import { GameUI } from "./game_ui";
const logger = createLogger("GameTable");

export class GameTable //게임을 진행하는 일종의 테이블(책상)
{
  static GAME_TABLE_MAP = new Map<string, GameTable>();

  public guild: Guild;
  public channel: TextChannel;  
  public voice_channel: VoiceChannel;

  private deleted: boolean = false;
  private game_session: GameSession | null = null;
  private voice_connection: VoiceConnection | null = null;

  private current_ui_message: Message | null = null;

  constructor(guild: Guild, channel: TextChannel, voice_channel: VoiceChannel)
  {
    this.guild = guild;
    this.channel = channel;
    this.voice_channel = voice_channel;
  }

  registerGameSession(game_session: GameSession): void
  {
    this.game_session = game_session;
    game_session.addTable(this);

    this.voice_connection?.subscribe(game_session.getAudioPlayer());
  }

  getGameSession(): GameSession | null
  {
    return this.game_session;
  }

  createVoiceConnection(): boolean 
  {
    const voice_connection = joinVoiceChannel({
      channelId: this.voice_channel.id,
      guildId: this.guild.id,
      adapterCreator: this.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator, 
    });

    logger.info(`Created Voice Connection. guild_id: ${this.guild.id}, voice_channel_id: ${this.voice_channel.id}`);

    // 보이스 연결이 끊겼을 때 핸들링
    voice_connection.on(VoiceConnectionStatus.Disconnected, async () => 
    {
      if (this.deleted) 
      {
        return;
      }

      try 
      {
        logger.info(`Trying voice reconnect. guild_id: ${this.guild.id}`);
        await Promise.race([
          entersState(voice_connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(voice_connection, VoiceConnectionStatus.Connecting, 5000),
        ]);
      }
      catch (error) 
      {
        logger.error(`Failed to voice reconnect. guild_id: ${this.guild.id}`);
        
        destroyVoiceConnect(this.voice_connection);

        this.sendMessage(`\`\`\`🔉 봇의 음성 연결이 끊겼어요. '/음성재연결' 명령어로 다시 데려올 수 있어요!\`\`\``);
      }
    });

    // 보이스 커넥션 생성 실패 문제 해결 방안
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const networkStateChangeHandler = (oldNetworkState: any, newNetworkState: any) => 
    {
      const newUdp = Reflect.get(newNetworkState, 'udp');
      clearInterval(newUdp?.keepAliveInterval);
    };

    voice_connection.on('stateChange', (oldState: VoiceConnectionState, newState: VoiceConnectionState) => 
    {
      const oldNetworking = Reflect.get(oldState, 'networking');
      const newNetworking = Reflect.get(newState, 'networking');

      oldNetworking?.off('stateChange', networkStateChangeHandler);
      newNetworking?.on('stateChange', networkStateChangeHandler);
    });

    this.voice_connection = voice_connection;

    return true;
  }

  reconnectVoice()
  {
    const game_session = this.getGameSession()
    if(!game_session)
    {
      return;
    }

    this.createVoiceConnection();
    this.voice_connection?.subscribe(game_session.getAudioPlayer());
  }

  sendUI(ui: GameUI)
  {
    //components
    this.channel.send(
      {
        embeds: [ui.embed],
        components: ui.components,
      }
    ).then((message: Message) => 
    {
      if(message)
      {
        this.current_ui_message = message;
      }
    });
  }

  editUI(ui: GameUI)
  {
    if(!this.current_ui_message)
    {
      logger.error('Cannot edit UI message. current_ui_message is null');
      return;
    }

    try
    {
      this.current_ui_message.edit(
        {
          embeds: [ui.embed],
          components: ui.components,
        }
      );
    }
    catch(err: unknown)
    {
      if(err instanceof Error)
      {
        logger.error(`Cannot edit UI message. ${err.message}`);
      }
    }
  }

  deleteUI()
  {
    if(!this.current_ui_message)
    {
      return;
    }

    try
    {
      this.current_ui_message.delete();
    }
    catch(err: unknown)
    {
      if(err instanceof Error)
      {
        logger.error(`Cannot delete UI message. ${err.message}`);
      }
    }
  }

  sendMessage(content: string)
  {
    this.channel.send({ content: content });
  }

  relayInteraction(interaction: Interaction)
  {
    this.getGameSession()?.relayInteraction(interaction);
  }

  expire(): void
  {
    logger.info(`Expiring game table. guild id: ${this.guild.id}`);

    destroyVoiceConnect(this.voice_connection);

    GameTable.GAME_TABLE_MAP.delete(this.guild.id);
  }
}
