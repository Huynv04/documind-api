import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JobsService, QueryPipelineDto } from './jobs.service';
import { DocumentService } from '../document/document.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Jobs & Ingestion Pipeline')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly documentService: DocumentService,
  ) {}

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.KNOWLEDGE_MANAGER)
  @ApiOperation({ summary: 'Lấy chỉ số sức khỏe hàng đợi BullMQ và hiệu năng worker' })
  async getQueueStats() {
    return this.jobsService.getQueueStats();
  }

  @Get('pipeline')
  @Roles(UserRole.ADMIN, UserRole.KNOWLEDGE_MANAGER)
  @ApiOperation({ summary: 'Lấy danh sách các tác vụ nạp tri thức trong pipeline' })
  async getPipelineJobs(@Query() query: QueryPipelineDto) {
    return this.jobsService.getPipelineJobs(query);
  }

  @Post(':id/retry')
  @Roles(UserRole.ADMIN, UserRole.KNOWLEDGE_MANAGER)
  @ApiOperation({ summary: 'Thử lại nạp một tài liệu vào hàng đợi BullMQ' })
  async retryJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.documentService.retryIngestion(id, user);
  }

  @Post('retry-all')
  @Roles(UserRole.ADMIN, UserRole.KNOWLEDGE_MANAGER)
  @ApiOperation({ summary: 'Kích hoạt thử lại toàn bộ các job thất bại' })
  async retryAllFailed(@CurrentUser() user: any) {
    return this.jobsService.retryAllFailed(user);
  }
}

