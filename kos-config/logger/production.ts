import * as winston from 'winston';

export default {
  level: 'verbose',
  format: winston.format.combine(
    winston.format.errors({stack: true}),
    winston.format.timestamp(),
    winston.format.metadata({fillExcept: ['level', 'message', 'tag']}),
    winston.format.json(),
  ),
};
