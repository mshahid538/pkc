const fs = require("fs");
const path = require("path");

const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const currentLogLevel =
  LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production';

let logDir, logFile;

if (!isServerless) {
  logDir = path.join(process.cwd(), "logs");
  logFile = path.join(
    logDir,
    `pkc-${new Date().toISOString().split("T")[0]}.log`
  );

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

const formatTimestamp = () => {
  return new Date().toISOString();
};

const formatMessage = (level, message, data = null) => {
  const timestamp = formatTimestamp();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    ...(data && { data }),
  };

  return JSON.stringify(logEntry);
};

const writeToFile = (logEntry) => {
  if (isServerless) {
    return;
  }
  
  try {
    fs.appendFileSync(logFile, logEntry + "\n");
  } catch (error) {
    console.error("File write error (expected in serverless):", error.message);
  }
};

const consoleOutput = (level, message, data = null) => {
  const timestamp = formatTimestamp();
  let color = colors.reset;

  switch (level.toUpperCase()) {
    case "ERROR":
      color = colors.red;
      break;
    case "WARN":
      color = colors.yellow;
      break;
    case "INFO":
      color = colors.green;
      break;
    case "DEBUG":
      color = colors.blue;
      break;
  }

  const prefix = `${color}[${timestamp}] ${level.toUpperCase()}:${
    colors.reset
  }`;
  console.log(`${prefix} ${message}`);
  if (data) {
    console.log(`${color}${JSON.stringify(data, null, 2)}${colors.reset}`);
  }
};

const log = (level, message, data = null) => {
  const logLevel = LOG_LEVELS[level.toUpperCase()];

  if (logLevel <= currentLogLevel) {
    const logEntry = formatMessage(level, message, data);

    writeToFile(logEntry);

    consoleOutput(level, message, data);
  }
};

const logger = {
  error: (message, data = null) => log("ERROR", message, data),
  warn: (message, data = null) => log("WARN", message, data),
  info: (message, data = null) => log("INFO", message, data),
  debug: (message, data = null) => log("DEBUG", message, data),

  request: (req, res, next) => {
    const start = Date.now();

    res.on("finish", () => {
      const duration = Date.now() - start;
      const logData = {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get("User-Agent"),
        ip: req.ip || req.connection.remoteAddress,
      };

      if (res.statusCode >= 400) {
        logger.error(`${req.method} ${req.url} - ${res.statusCode}`, logData);
      } else {
        logger.info(`${req.method} ${req.url} - ${res.statusCode}`, logData);
      }
    });

    next();
  },

  db: {
    query: (query, params = null) => {
      logger.debug("Database query", { query, params });
    },
    error: (error, query = null) => {
      logger.error("Database error", { error: error.message, query });
    },
  },

  file: {
    upload: (filename, size, userId) => {
      logger.info("File uploaded", { filename, size, userId });
    },
    delete: (filename, userId) => {
      logger.info("File deleted", { filename, userId });
    },
    error: (error, operation) => {
      logger.error("File operation error", { error: error.message, operation });
    },
  },

  auth: {
    login: (userId, email) => {
      logger.info("User login", { userId, email });
    },
    register: (userId, email) => {
      logger.info("User registration", { userId, email });
    },
    failed: (email, reason) => {
      logger.warn("Authentication failed", { email, reason });
    },
  },

  getLevel: () => {
    return Object.keys(LOG_LEVELS).find(
      (key) => LOG_LEVELS[key] === currentLogLevel
    );
  },

  setLevel: (level) => {
    if (LOG_LEVELS[level.toUpperCase()] !== undefined) {
      currentLogLevel = LOG_LEVELS[level.toUpperCase()];
      logger.info(`Log level changed to ${level.toUpperCase()}`);
    }
  },
};

module.exports = logger;
