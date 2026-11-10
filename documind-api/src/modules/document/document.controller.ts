import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { DocumentService } from './document.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload')
  @Roles(UserRole.KNOWLEDGE_MANAGER, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Tải lên tài liệu mới (PDF, DOCX, TXT, MD - Tối đa 20MB)',
    description: 'Chỉ dành cho Quản trị viên (ADMIN) và Quản lý Tri thức (KNOWLEDGE_MANAGER)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Tệp tin tải lên (PDF, DOCX, TXT, MD)',
        },
        sensitivity: {
          type: 'string',
          enum: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL'],
          default: 'INTERNAL',
        },
        allowedRoles: {
          type: 'array',
          items: { type: 'string', enum: ['EMPLOYEE', 'KNOWLEDGE_MANAGER', 'ADMIN'] },
        },
        departmentId: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Tải lên thành công' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 20 * 1024 * 1024, // Giới hạn 20MB
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.documentService.uploadDocument(file, dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tài liệu (Phân trang, tìm kiếm & Lọc RBAC)' })
  async findAll(
    @Query() query: QueryDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.documentService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Xem thông tin chi tiết một tài liệu' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.documentService.findOne(id, user);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Tải xuống tệp tin gốc' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const { buffer, originalName, mimeType } = await this.documentService.downloadFile(id, user);

    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName)}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Delete(':id')
  @Roles(UserRole.KNOWLEDGE_MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Xóa tài liệu khỏi hệ thống' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: any,
  ) {
    return this.documentService.delete(id, user);
  }
}

