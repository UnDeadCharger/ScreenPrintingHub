import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { UploadResult } from '@sph/shared';
import { UPLOAD_DIR } from './env';

// ponytail: trusts the client-declared mime type; sniff magic bytes if untrusted users ever upload.
const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Controller('uploads')
export class UploadsController {
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 15 * 1024 * 1024 } }))
  async upload(@UploadedFile() file?: Express.Multer.File): Promise<UploadResult> {
    const ext = file && EXTENSIONS[file.mimetype];
    if (!file || !ext) {
      throw new BadRequestException('Expected a jpeg, png or webp image in form field "file"');
    }
    const path = randomUUID() + ext;
    await writeFile(join(UPLOAD_DIR, path), file.buffer);
    return { path };
  }
}
