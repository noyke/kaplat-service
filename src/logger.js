const winston = require("winston");

const { globalRequestCounter } = require("./globals");

const logggerBaseConfig = {
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "DD-MM-YYYY HH:mm:ss.sss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} ${level.toUpperCase()}: ${message} | request #${globalRequestCounter}`;
    })
  ),
};

const requestLogger = winston.createLogger({
  ...logggerBaseConfig,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/requests.log" }),
  ],
});

const todoLogger = winston.createLogger({
  ...logggerBaseConfig,
  transports: [new winston.transports.File({ filename: "logs/todos.log" })],
});

module.exports = {
  requestLogger,
  todoLogger,
};
