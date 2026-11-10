import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { MetricsService } from './metrics.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class AdminModule {}
