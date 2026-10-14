export const logger = {
  info: (msg: string, ...args: any[]) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${msg}`, ...args);
  },
  warn: (msg: string, ...args: any[]) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${msg}`, ...args);
  },
  error: (msg: string, ...args: any[]) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`, ...args);
  },
  debug: (msg: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEBUG] [${new Date().toISOString()}] ${msg}`, ...args);
    }
  }
};
