import {TypeOrmModuleOptions} from '@nestjs/typeorm';

export const defConf: TypeOrmModuleOptions = {
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'kos_dev_user',
  password: 'kos_dev_password',
  database: 'kos_dev_db',
  entities: [__dirname + '/../../**/*.entity.{js,ts}'],
  synchronize: true,
  // keepConnectionAlive: true,
  logging: true,
};
