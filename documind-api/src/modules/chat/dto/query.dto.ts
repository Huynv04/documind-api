import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QueryDto {
  @ApiProperty({ example: 'Quy trình xin nghỉ phép gồm những bước nào?' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ example: 'uuid-session-id', required: false })
  @IsOptional()
  @IsUUID()
  sessionId?: string;
}

