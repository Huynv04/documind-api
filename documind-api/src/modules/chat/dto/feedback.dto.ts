import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class FeedbackDto {
  @ApiProperty({ example: true, description: 'true = Like, false = Dislike' })
  @IsBoolean()
  isPositive: boolean;

  @ApiProperty({ example: 'Thông tin trong câu trả lời đã lỗi thời', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}

