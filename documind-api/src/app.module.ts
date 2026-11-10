import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';
import { BullModule } from '@nestjs/bull';

import envConfig from '@config/env.config';
import { AuthModule } from '@modules/auth/auth.module';
import { DocumentModule } from '@modules/document/document.module';
import { ChatModule } from '@modules/chat/chat.module';

@Module({
  imports: [
    // --- Config ---
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      envFilePath: '.env',
    }),

    // --- Logger (Pino) ---
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        level: process.env.LOG_LEVEL || 'info',
        redact: ['req.headers.authorization'], // Hide JWT in logs
      },
    }),

    // --- Rate Limiting ---
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),

    // --- Events ---
    EventEmitterModule.forRoot(),

    // --- BullMQ Queue Root Config ---
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD') || undefined,
        },
      }),
    }),

    // --- Feature Modules ---
    AuthModule,
    DocumentModule,
    ChatModule,
  ],
})
export class AppModule {}
