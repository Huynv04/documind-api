import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as Minio from 'minio';
import * as fs from 'fs';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly driver: 'local' | 'minio' | 's3';
  private readonly localUploadDir: string;
  private minioClient?: Minio.Client;
  private readonly minioBucket: string;

  constructor(private config: ConfigService) {
    this.driver = (this.config.get('STORAGE_DRIVER') || 'minio') as 'local' | 'minio' | 's3';
    this.minioBucket = this.config.get('MINIO_BUCKET') || 'documind-uploads';
    this.localUploadDir = path.join(process.cwd(), 'storage', 'uploads');

    if (this.driver === 'minio' || this.driver === 's3') {
      const endpoint = this.config.get('MINIO_ENDPOINT') || 'localhost';
      const port = Number(this.config.get('MINIO_PORT') || 9000);
      const useSSL =
        this.config.get('MINIO_USE_SSL') === 'true' ||
        this.config.get('MINIO_USE_SSL') === true;
      const accessKey = this.config.get('MINIO_ACCESS_KEY') || 'minioadmin';
      const secretKey = this.config.get('MINIO_SECRET_KEY') || 'minioadmin';

      this.minioClient = new Minio.Client({
        endPoint: endpoint,
        port,
        useSSL,
        accessKey,
        secretKey,
      });

      this.logger.log(
        `🗄️ Initialized MinIO/S3 Storage Client (Endpoint: ${endpoint}:${port}, Bucket: ${this.minioBucket})`,
      );
    }
  }

  async onModuleInit() {
    if (this.driver === 'minio' || this.driver === 's3') {
      await this.ensureBucketExists();
    } else {
      // Local storage fallback (chỉ khi được cấu hình rõ ràng STORAGE_DRIVER=local)
      if (!fs.existsSync(this.localUploadDir)) {
        fs.mkdirSync(this.localUploadDir, { recursive: true });
      }
    }
  }

  /**
   * Tự động kiểm tra và khởi tạo Bucket trên MinIO/S3 nếu chưa tồn tại
   */
  private async ensureBucketExists(): Promise<void> {
    if (!this.minioClient) return;

    try {
      const exists = await this.minioClient.bucketExists(this.minioBucket);
      if (!exists) {
        await this.minioClient.makeBucket(this.minioBucket, 'us-east-1');
        this.logger.log(`✅ MinIO: Đã tạo thành công bucket "${this.minioBucket}"`);
      } else {
        this.logger.log(`✅ MinIO: Đã kết nối sẵn sàng tới bucket "${this.minioBucket}"`);
      }
    } catch (err: any) {
      this.logger.error(
        `❌ Không thể kết nối tới MinIO Storage: ${err?.message}. Vui lòng khởi động MinIO container (docker compose up -d minio).`,
      );
    }
  }

  /**
   * Lưu tệp tin trực tiếp lên MinIO/S3 Object Storage (KHÔNG lưu trong thư mục project)
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<string> {
    const ext = path.extname(originalName);
    const sanitizedBase = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const storageKey = `${Date.now()}-${uuidv4().slice(0, 8)}-${sanitizedBase}${ext}`;

    // 1. Chế độ MinIO / S3 (Mặc định được ưu tiên)
    if (this.driver === 'minio' || this.driver === 's3') {
      if (!this.minioClient) {
        throw new ServiceUnavailableException(
          'Dịch vụ lưu trữ MinIO/S3 chưa được khởi tạo. Vui lòng kiểm tra cấu hình.',
        );
      }

      try {
        await this.ensureBucketExists();

        await this.minioClient.putObject(
          this.minioBucket,
          storageKey,
          fileBuffer,
          fileBuffer.length,
          {
            'Content-Type': mimeType,
            'x-amz-meta-original-name': encodeURIComponent(originalName),
          },
        );

        this.logger.log(`📤 Đã tải tệp "${originalName}" lên MinIO/S3 với key: ${storageKey}`);
        return storageKey;
      } catch (err: any) {
        this.logger.error(`Lỗi khi đẩy tệp lên MinIO: ${err?.message}`);
        throw new ServiceUnavailableException(
          `Không thể lưu tệp vào MinIO/S3 Object Storage. Đảm bảo MinIO đang hoạt động: ${err?.message}`,
        );
      }
    }

    // 2. Chế độ Local disk (chỉ kích hoạt nếu người dùng cố tình cấu hình STORAGE_DRIVER=local)
    if (!fs.existsSync(this.localUploadDir)) {
      fs.mkdirSync(this.localUploadDir, { recursive: true });
    }
    const fullPath = path.join(this.localUploadDir, storageKey);
    await fs.promises.writeFile(fullPath, fileBuffer);
    return storageKey;
  }

  /**
   * Đọc Buffer của tệp tin từ MinIO/S3 để phục vụ Parser và Stream tải về
   */
  async getFileBuffer(storageKey: string): Promise<Buffer> {
    if (this.driver === 'minio' || this.driver === 's3') {
      if (!this.minioClient) {
        throw new ServiceUnavailableException('Dịch vụ lưu trữ MinIO/S3 chưa sẵn sàng.');
      }

      try {
        const stream = await this.minioClient.getObject(this.minioBucket, storageKey);
        return new Promise<Buffer>((resolve, reject) => {
          const chunks: Buffer[] = [];
          stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
          stream.on('error', (err) => reject(err));
          stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
      } catch (err: any) {
        this.logger.error(`Không thể đọc tệp ${storageKey} từ MinIO: ${err?.message}`);
        throw new ServiceUnavailableException(
          `Không thể tải tệp từ MinIO/S3: ${err?.message || 'Tệp không tồn tại'}`,
        );
      }
    }

    // Local fallback
    const fullPath = path.isAbsolute(storageKey)
      ? storageKey
      : path.join(this.localUploadDir, storageKey);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Tệp tin không tồn tại trên ổ đĩa: ${storageKey}`);
    }
    return fs.promises.readFile(fullPath);
  }

  /**
   * Xóa tệp tin khỏi MinIO/S3 Object Storage
   */
  async deleteFile(storageKey: string): Promise<void> {
    if (this.driver === 'minio' || this.driver === 's3') {
      if (!this.minioClient) return;
      try {
        await this.minioClient.removeObject(this.minioBucket, storageKey);
        this.logger.log(`🗑️ Đã xóa tệp ${storageKey} khỏi MinIO/S3`);
      } catch (err: any) {
        this.logger.warn(`Không thể xóa tệp ${storageKey} khỏi MinIO: ${err?.message}`);
      }
      return;
    }

    const fullPath = path.isAbsolute(storageKey)
      ? storageKey
      : path.join(this.localUploadDir, storageKey);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath);
    }
  }

  /**
   * Tạo Presigned URL cho phép tải tệp trực tiếp từ MinIO/S3 mà không cần qua API
   */
  async getPresignedDownloadUrl(storageKey: string, expirySeconds = 3600): Promise<string> {
    if (this.driver === 'minio' || this.driver === 's3') {
      if (!this.minioClient) {
        throw new ServiceUnavailableException('Dịch vụ MinIO chưa sẵn sàng.');
      }
      return this.minioClient.presignedGetObject(this.minioBucket, storageKey, expirySeconds);
    }
    return `/api/v1/documents/${storageKey}/download`;
  }

  getDriver(): string {
    return this.driver;
  }
}
