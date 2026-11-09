import { Controller, Get, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { RolesGuard, UserRole } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private metricsService: MetricsService) {}

  @Get('metrics/overview')
  @ApiOperation({ summary: 'System metrics overview (tokens, users, docs, cost)' })
  getOverview() {
    return this.metricsService.getOverview();
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'View audit logs with pagination' })
  getAuditLogs(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.metricsService.getAuditLogs(page, limit);
  }
}
