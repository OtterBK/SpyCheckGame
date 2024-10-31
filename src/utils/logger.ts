import dotenv from 'dotenv';
import path from 'path';
import winston, { Logger } from 'winston';
import 'winston-daily-rotate-file';

// .env 파일을 로드
dotenv.config();

// 현재 작업 디렉토리에서 .env 파일의 위치를 기준으로 LOG_PATH 경로 설정
const env_base_path = process.cwd();
const log_dir = path.resolve(env_base_path, process.env.LOG_PATH || './log'); // .env의 LOG_PATH를 절대 경로로 변환

const colorize = winston.format.colorize();
const { combine, timestamp, printf, label } = winston.format;

// Define log format
const logFormat = printf(({ level, message, label, timestamp }) => 
{
  return `${colorize.colorize(level, `${timestamp} [${level}] [${label ?? 'default'}]`)} : ${message}`;
});

export const getLogger = (path: string): Logger => 
{
  const logger = winston.createLogger({
    level: process.env.DEVELOP_MODE === 'true' ? 'debug' : 'info',
    levels: {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3,
    },
    format: combine(
      label({ label: path }),
      timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      logFormat,
    ),
    transports: [
      new winston.transports.DailyRotateFile({
        datePattern: 'YYYY-MM-DD',
        dirname: log_dir, // 절대 경로로 변환된 log 폴더 경로 사용
        filename: `%DATE%.log`,
        zippedArchive: true,
        maxFiles: process.env.LOG_MAX_FILES,
        maxSize: process.env.LOG_MAX_SIZE,
      }),
    ],
  });

  if (process.env.DEVELOP_MODE === 'true') 
  {
    logger.add(new winston.transports.Console({
      format: combine(
        label({ label: path }),
        timestamp(),
        logFormat,
      ),
      level: 'debug',
    }));
  }

  return logger;
};
