import { PrismaService } from "@modules/prisma/prisma.service";
import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { RegisterDto } from "./dto/register.dto";
import * as bcrypt from 'bcryptjs';
import { UserRole } from "@prisma/client";
import { LoginDto } from "./dto/login.dto";

@Injectable()
export class AuthService {
  constructor(
    // 1. Thao tác với Cơ sở dữ liệu (PostgreSQL)
    private prisma: PrismaService,
    // 2. Ký và giải mã Token JWT
    private jwtService: JwtService,
    // Để đọc file .env
    private config: ConfigService,
  ) { }
  /*
  1. HÀM ĐĂNG KÝ TÀI KHOẢN (REGISTER)
 */
  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email }, });
    if (existingUser) {
      throw new ConflictException('Email nay da duoc dang ki trong he thong');
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const newUser = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash: hashedPassword,
        role: UserRole.EMPLOYEE
      }
    });
    return this.generateTokens(newUser);
  }

  /*
   2. HÀM ĐĂNG NHẬP (LOGIN)
  */
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email }, });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị vô hiệu hóa');
    }
    return this.generateTokens(user);
  }

  /**
    * 3. HÀM XỬ LÝ ĐĂNG NHẬP GOOGLE (SSO)
    */
  async handleGoogleLogin(googleUser: {
    email: string;
    name: string;
    googleId: string;
    avatar?: string;
  }) {
    // Bước 1: Kiểm tra xem email từ Google đã có trong DB chưa
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email },
    });
    // Bước 2: Nếu chưa từng có -> Tự động tạo tài khoản mới cho nhân viên này
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name,
          googleId: googleUser.googleId,
          avatar: googleUser.avatar,
          role: UserRole.EMPLOYEE, // Role mặc định
          isActive: true,
        },
      });
    }
    // Bước 3: Kiểm tra xem tài khoản có bị khóa không
    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị vô hiệu hóa');
    }
    // Bước 4: Cấp Token để đăng nhập
    return this.generateTokens(user);
  }

  /*
   5. HÀM PHỤ TRỢ: SINH CẶP TOKEN (ACCESS + REFRESH)
  */
  private generateTokens(user: { id: string; email: string; role: string; name?: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '30d'),
      }),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
  /*
 4. HÀM XÁC THỰC TOKEN CHO JWT STRATEGY
  (Hàm này được JwtStrategy gọi tự động mỗi khi có request gửi token lên)
 */
  async validateJwtPayload(payload: { sub: string; email: string }) {
    // Tìm user theo ID (sub chính là user.id)
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    // Đề phòng trường hợp Token còn hạn nhưng Admin đã xóa user khỏi DB
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Người dùng không tồn tại hoặc đã bị khóa');
    }

    // Dữ liệu return ở đây sẽ được gắn vào biến: req.user
    return user;
  }

}