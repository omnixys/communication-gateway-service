import { AppModule } from './app.module.js';
import { env } from './config/env.js';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, } from '@nestjs/platform-fastify';
import { getLogger } from '@omnixys/logger-ts';
import { registerFastifyTracing } from '@omnixys/observability-ts';
import 'reflect-metadata';
const logger = getLogger('Bootstrap', 'class');
export async function bootstrap() {
    const app = await NestFactory.create(AppModule, new FastifyAdapter({ logger: false, bodyLimit: 10 * 1024 * 1024 }), { rawBody: true });
    try {
        registerFastifyTracing(app.getHttpAdapter().getInstance());
        app.enableShutdownHooks();
        await app.listen(env.PORT, env.HOST);
        logger.info({ port: env.PORT }, 'gateway_started');
        return app;
    }
    catch (error) {
        await app.close();
        throw error;
    }
}
void bootstrap().catch((error) => {
    process.stderr.write('Communication Gateway startup failed; check configuration and dependencies.\n');
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'gateway_start_failed');
    process.exitCode = 1;
});
