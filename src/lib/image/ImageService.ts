import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

interface ImageDimensions {
  width: number;
  height: number;
}

interface ImageFormat {
  format: 'jpeg' | 'webp' | 'avif';
  quality: number;
}

interface ImageOptions {
  dimensions?: ImageDimensions;
  format?: ImageFormat;
  blur?: number;
}

export class ImageService {
  private static s3Client = new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  private static readonly bucketName = process.env.AWS_BUCKET_NAME!;
  private static readonly cdnDomain = process.env.CDN_DOMAIN;

  static async uploadImage(
    file: Buffer,
    options: ImageOptions = {}
  ): Promise<string> {
    try {
      let imageBuffer = sharp(file);

      // Resize if dimensions provided
      if (options.dimensions) {
        imageBuffer = imageBuffer.resize(
          options.dimensions.width,
          options.dimensions.height,
          {
            fit: 'cover',
            position: 'center'
          }
        );
      }

      // Apply format and quality
      if (options.format) {
        switch (options.format.format) {
          case 'webp':
            imageBuffer = imageBuffer.webp({ quality: options.format.quality });
            break;
          case 'avif':
            imageBuffer = imageBuffer.avif({ quality: options.format.quality });
            break;
          default:
            imageBuffer = imageBuffer.jpeg({ quality: options.format.quality });
        }
      }

      // Apply blur if specified
      if (options.blur) {
        imageBuffer = imageBuffer.blur(options.blur);
      }

      const optimizedBuffer = await imageBuffer.toBuffer();

      // Generate unique filename
      const filename = `${uuidv4()}.${options.format?.format || 'jpeg'}`;
      const key = `images/${filename}`;

      // Upload to S3
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: optimizedBuffer,
          ContentType: `image/${options.format?.format || 'jpeg'}`
        })
      );

      // Return CDN URL if configured, otherwise S3 URL
      return this.cdnDomain
        ? `https://${this.cdnDomain}/${key}`
        : `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error('Failed to upload image');
    }
  }

  static async generateThumbnail(
    imageUrl: string,
    dimensions: ImageDimensions
  ): Promise<string> {
    try {
      // Download image
      const response = await fetch(imageUrl);
      const imageBuffer = await response.arrayBuffer();

      // Generate thumbnail
      const thumbnail = await sharp(Buffer.from(imageBuffer))
        .resize(dimensions.width, dimensions.height, {
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 80 })
        .toBuffer();

      // Upload thumbnail
      const filename = `thumbnail-${uuidv4()}.webp`;
      const key = `thumbnails/${filename}`;

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: thumbnail,
          ContentType: 'image/webp'
        })
      );

      return this.cdnDomain
        ? `https://${this.cdnDomain}/${key}`
        : `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    } catch (error) {
      console.error('Thumbnail generation error:', error);
      throw new Error('Failed to generate thumbnail');
    }
  }

  static async getPresignedUploadUrl(
    filename: string,
    contentType: string
  ): Promise<string> {
    const key = `uploads/${uuidv4()}-${filename}`;
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType
    });

    return getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
  }

  static async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract key from URL
      const key = this.extractKeyFromUrl(imageUrl);

      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key
        })
      );
    } catch (error) {
      console.error('Image deletion error:', error);
      throw new Error('Failed to delete image');
    }
  }

  private static extractKeyFromUrl(url: string): string {
    if (this.cdnDomain && url.includes(this.cdnDomain)) {
      return url.split(this.cdnDomain + '/')[1];
    }
    return url.split('.amazonaws.com/')[1];
  }

  static async generateResponsiveImages(
    imageBuffer: Buffer,
    formats: ImageFormat[] = [
      { format: 'webp', quality: 80 },
      { format: 'avif', quality: 80 }
    ],
    sizes: number[] = [640, 750, 828, 1080, 1200]
  ): Promise<string[]> {
    const urls: string[] = [];

    for (const format of formats) {
      for (const width of sizes) {
        const url = await this.uploadImage(imageBuffer, {
          dimensions: { width, height: Math.round(width * 0.75) },
          format
        });
        urls.push(url);
      }
    }

    return urls;
  }

  static getImageDimensions(buffer: Buffer): Promise<ImageDimensions> {
    return sharp(buffer).metadata().then(metadata => ({
      width: metadata.width || 0,
      height: metadata.height || 0
    }));
  }
}