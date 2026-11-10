import { Controller, Get, Query, UseGuards, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { RolesGuard, UserRole } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('metrics/overview')
  @ApiOperation({
    summary: 'Tổng hợp chỉ số toàn diện hệ thống (Overview)',
    description: 'Thống kê tổng số người dùng, tài liệu theo trạng thái, dung lượng lưu trữ, tin nhắn, token tiêu thụ và chi phí AI ước tính (USD / VND).',
  })
  @ApiResponse({ status: 200, description: 'Trả về toàn bộ chỉ số hệ thống' })
  @ApiResponse({ status: 403, description: 'Từ chối truy cập: Chỉ tài khoản ADMIN mới có quyền' })
  getOverview() {
    return this.metricsService.getOverview();
  }

  @Get('metrics')
  @ApiOperation({
    summary: 'Endpoint alias: Lấy chỉ số hệ thống (Metrics)',
    description: 'Đồng bộ với đặc tả API GET /api/v1/admin/metrics trong tài liệu nghiệp vụ.',
  })
  getMetrics() {
    return this.metricsService.getOverview();
  }

  @Get('audit-logs')
  @ApiOperation({
    summary: 'Truy xuất nhật ký kiểm toán (Audit Logs) có phân trang & bộ lọc',
    description: 'Hỗ trợ lọc theo action (QUERY, UPLOAD, DELETE, FEEDBACK), resourceType, userId, khoảng thời gian và tìm kiếm.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách Audit Logs kèm phân trang' })
  @ApiResponse({ status: 403, description: 'Từ chối truy cập: Chỉ tài khoản ADMIN mới có quyền' })
  getAuditLogs(
    @Query(new ValidationPipe({ transform: true, whitelist: true })) query: AuditLogQueryDto,
  ) {
    return this.metricsService.getAuditLogs(query);
  }
}
