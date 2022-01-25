import 'source-map-support/register';

import {join} from 'path';

import {NestFactory} from '@nestjs/core';
import {NestExpressApplication} from '@nestjs/platform-express';
import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import * as helmet from 'helmet';

import {KOS_APP_COMPANION_URL_PROD} from '../../../agnostic/kos-lib/src/urls/kos-app-companion-url-prod';
import {KOS_APP_COMPANION_URL_STAGE} from '../../../agnostic/kos-lib/src/urls/kos-app-companion-url-stage';
import {WinstonLogger} from '../../common/logger/logger.service';
import httpServerConfig from '../../kos-config/http-server/configuration';

import {AppModule} from './app.module';
import {ErrorFilter} from './errors.filter';
import {LoggingInterceptor} from './interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const logger = new WinstonLogger('bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger,
  });

  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalFilters(new ErrorFilter());

  // express specific
  app.disable('x-powered-by');

  app.enableCors({
    // TODO: move to configs
    origin: [
      // frontend showcase-web
      'http://localhost:4200', // local
      'https://localhost:4200', // local
      'https://localhost.azarus.io:4200', // local
      'https://showcase.azarus.io', // stage

      // frontend kos-twitch
      'http://localhost:4201', // local
      'https://localhost:4201', // local
      'https://localhost.azarus.io:4201', // local
      'https://ovrkovpayzwvr4blb6abpcifjl7kou.ext-twitch.tv', // twitch (alexksso)

      // frontend kos-companion-web
      'http://localhost:4202', // local
      'https://localhost:4202', // local
      'https://localhost.azarus.io:4202', // local
      KOS_APP_COMPANION_URL_STAGE, // stage
      KOS_APP_COMPANION_URL_PROD, // prod
    ],
    credentials: true,
  });
  app.use(helmet());
  app.use(cookieParser());
  app.use(
    session({
      // TODO: move to configs
      secret: '9rdL7ReCQtbjybr3',
      resave: false,
      saveUninitialized: false,
    }),
  );
  app.setBaseViewsDir(join(__dirname, '..', '..', '..', 'views'));
  app.setViewEngine('pug');

  await app.listen(httpServerConfig.port);
  logger.log(`Application is listening on port ${httpServerConfig.port}`);
}

bootstrap();
