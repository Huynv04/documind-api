import { IsEmail, IsString, MinLength } from 'class-validator';
export class LoginDto {
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải từ 6 kí tự trở lên' })
  password: string;
}
