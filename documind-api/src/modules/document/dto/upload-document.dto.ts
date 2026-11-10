import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, SensitivityLevel } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadDocumentDto {
  @ApiPropertyOptional({
    enum: SensitivityLevel,
    default: SensitivityLevel.INTERNAL,
    description: 'Mức độ nhạy cảm của tài liệu',
  })
  @IsOptional()
  @IsEnum(SensitivityLevel)
  sensitivity?: SensitivityLevel;

  @ApiPropertyOptional({
    enum: UserRole,
    isArray: true,
    description: 'Danh sách vai trò được phép đọc tài liệu (RBAC)',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return value.split(',').map((v: string) => v.trim());
      }
    }
    return value;
  })
  @IsArray()
  allowedRoles?: UserRole[];

  @ApiPropertyOptional({
    description: 'Mã phòng ban sở hữu tài liệu',
  })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({
    description: 'Thẻ tag phân loại tài liệu (ngăn cách bởi dấu phẩy)',
    type: [String],
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [value];
      } catch {
        return value.split(',').map((v: string) => v.trim());
      }
    }
    return value;
  })
  @IsArray()
  tags?: string[];
}

