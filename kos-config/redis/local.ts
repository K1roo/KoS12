/* eslint-disable @typescript-eslint/naming-convention */
export default {
  singleMode: {
    host: 'localhost',
    port: 6379,
    retry_strategy: () => 1000,
    connect_timeout: 5000,
    max_attempts: 5,
  },
  clusterMode: {
    servers: [],
    options: {},
  },
  url: 'redis://localhost:6379',
};
