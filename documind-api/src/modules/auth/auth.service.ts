import { PrismaService } from "@modules/prisma/prisma.service";
import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";

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
  /**
 * ==========================================
 * 1. HÀM ĐĂNG KÝ TÀI KHOẢN (REGISTER)
 * ==========================================
 */
  async register(dto: )
}