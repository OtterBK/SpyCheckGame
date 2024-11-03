import { VoiceConnection } from "@discordjs/voice";
import { Message } from "discord.js";
import path from "path";

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

export function deleteMessage(message: Message | null)
{
  if(!message)
  {
    return;
  }

  try
  {
    message.delete();
  }
  catch(err)
  {
    return;
  }
}

export function sleep(duration: number)
{
  return new Promise<void>((resolve, reject) => 
  {
    setTimeout(() => 
    {
      resolve(); 
    }, duration);
  });
};

export function cancelableSleep(duration: number): [promise: Promise<void>, cancel: () => void ] 
{
  let timeout: NodeJS.Timeout | null = null;
  let cancel: () => void;

  const promise = new Promise<void>((resolve) => 
  {
    timeout = setTimeout(() => 
    {
      resolve();
    }, duration);

    // `cancel` 함수 정의: 타이머를 중단하고, Promise를 즉시 완료
    cancel = () => {
      if (timeout) 
      {
        clearTimeout(timeout);
      }
      resolve(); // 타이머가 취소된 경우에도 `resolve` 호출
    };
  });

  // `cancel` 메서드가 사용되므로 `timeout`을 반환할 필요 없음
  return [promise, cancel!];
}


export function generateUUID(): string //UUID v4 형식
{
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) 
  {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export function getRandomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function getRandomElement<T>(array: T[]): T {
  if (array.length === 0) 
  {
    throw new Error('trying get random element but array is empty');
  }

  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

export function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]]; // swap
  }
  return array;
}

export function getAbsolutePath(target_path: string | null | undefined): string 
{
  const env_base_path = process.cwd();
  return path.resolve(env_base_path, target_path || ''); // .env의 LOG_PATH를 절대 경로로 변환
}
