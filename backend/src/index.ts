import { app } from './app';
import { env } from './config/env';
import { AppDataSource } from './config/data-source';

async function bootstrap(): Promise<void> {
  await AppDataSource.initialize();

  app.listen(env.port, () => {
    console.log(`Express listening on port ${env.port}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start AssetFlow API', error);
  process.exit(1);
});