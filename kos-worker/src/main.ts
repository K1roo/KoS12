import 'source-map-support/register';
import 'reflect-metadata';

import {NestFactory} from '@nestjs/core';

import {SupportedGames} from '../../../agnostic/supported-games';
import {KosEnablerJobsModule} from '../../common/jobs/kos-enabler-jobs/kos-enabler-jobs.module';
import {KosEnablerJobsProcessor} from '../../common/jobs/kos-enabler-jobs/kos-enabler-jobs.processor';
import {RepeatableJobsRegistry} from '../../common/jobs/repeatable-jobs-registry';
import {WinstonLogger} from '../../common/logger/logger.service';
import {JobProcessor} from '../../common/types/services-communication/bull/job-processor';

import {WorkerAppModule} from './worker-app.module';

const JOBS_MODULES_TO_REGISTER: Map<any, typeof JobProcessor> = new Map([
  [KosEnablerJobsModule, KosEnablerJobsProcessor],
]);

const logger = new WinstonLogger('bootstrap');

async function bootstrap(): Promise<void> {
  const worker = await NestFactory.createApplicationContext(WorkerAppModule);
  await worker.init();

  JOBS_MODULES_TO_REGISTER.forEach(async (processor, module) => {
    const jobProcessor = worker.select(module).get(processor);
    await RepeatableJobsRegistry.registerJobs(
      jobProcessor.queue,
      jobProcessor.repeatableJobs,
    );
  });
  logger.log('Worker started', {
    supportedGames: SupportedGames,
    branch: process.env.BRANCH,
    revision: process.env.REVISION,
  });
}

bootstrap();
