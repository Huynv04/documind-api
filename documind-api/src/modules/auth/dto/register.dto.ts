import { IsEmail, IsString, MinLength, Matches } from 'class-validator';
export class RegisterDto {
  @IsString()
  name: string;

  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải từ 6 kí tự trở lên' })
  @Matches(/^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>])/,
    { message: 'Mật khẩu phải chứa ít nhất 1 chữ in hoa và 1 ký tự đặc biệt' })
  password: string;
}