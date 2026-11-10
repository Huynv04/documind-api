import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus, SensitivityLevel } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class QueryDocumentDto {
  @ApiPropertyOptional({ default: 1, description: 'Số trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, description: 'Số lượng mục trên mỗi trang' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ enum: DocumentStatus, description: 'Lọc theo trạng thái xử lý' })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional({ enum: SensitivityLevel, description: 'Lọc theo cấp độ nhạy cảm' })
  @IsOptional()
  @IsEnum(SensitivityLevel)
  sensitivity?: SensitivityLevel;

  @ApiPropertyOptional({ description: 'Lọc theo ID phòng ban' })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Từ khóa tìm kiếm theo tên tệp' })
  @IsOptional()
  @IsString()
  search?: string;
}

