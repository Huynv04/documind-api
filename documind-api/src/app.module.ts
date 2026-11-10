import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';

import envConfig from '@config/env.config';
import { AuthModule } from '@modules/auth/auth.module';

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

    // --- Feature Modules ---
    AuthModule
  ],
})
export class AppModule { }

