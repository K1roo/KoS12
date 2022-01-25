import * as winston from 'winston';

export default {
  level: 'debug',
  format: winston.format.combine(
    winston.format.errors({stack: true}),
    winston.format.timestamp(),
    winston.format.metadata({fillExcept: ['level', 'message', 'tag']}),
    winston.format.colorize({message: true, level: true}),
    winston.format.simple(),
  ),
};
