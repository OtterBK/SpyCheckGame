import { VoiceConnection } from "@discordjs/voice";

export function destroyVoiceConnect(voice_connection: VoiceConnection | null)
{
  if(!voice_connection)
  {
    return;
  }

  try
  {
    voice_connection.destroy();
  }
  catch(err)
  {
    return;
  }
}