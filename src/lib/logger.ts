type LogLevel = "error" | "warn" | "info" | "debug";

interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
}

const config: LoggerConfig = {
  enabled: process.env.NODE_ENV !== "production",
  level: "error",
};

const levels: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function shouldLog(level: LogLevel): boolean {
  return config.enabled && levels[level] <= levels[config.level];
}

export const logger = {
  error: (message: string, error?: unknown) => {
    if (shouldLog("error")) {
      console.error(`[ERROR] ${message}`, error ?? "");
    }
    // In production, you could send to an error tracking service here:
    // if (process.env.NODE_ENV === "production") {
    //   Sentry.captureException(error);
    // }
  },

  warn: (message: string, data?: unknown) => {
    if (shouldLog("warn")) {
      console.warn(`[WARN] ${message}`, data ?? "");
    }
  },

  info: (message: string, data?: unknown) => {
    if (shouldLog("info")) {
      console.info(`[INFO] ${message}`, data ?? "");
    }
  },

  debug: (message: string, data?: unknown) => {
    if (shouldLog("debug")) {
      console.debug(`[DEBUG] ${message}`, data ?? "");
    }
  },
};
