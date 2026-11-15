import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { BadRequestException, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { ImportResult } from '@sph/shared';
import type { Request, Response } from 'express';
import type { Model } from 'mongoose';
import { UPLOAD_DIR } from '../env';
import type { OrderDoc } from './order.schema';
import { TAR_END, tarEntries, tarHeader, tarPadding } from './tar';

// Exactly the names the upload endpoint generates. Anything else in a backup is ignored, so a
// crafted archive cannot write outside the upload folder.
const PHOTO = /^[0-9a-f-]{36}\.(?:jpg|png|webp)$/;

/**
 * One-file backup: a tar holding `orders.json` (every order) and `uploads/<photo>`.
 * Import only adds what is missing. It never changes or removes an order or photo that exists.
 */
@Controller('backup')
export class BackupController {
  constructor(@InjectModel('Order') private readonly orders: Model<OrderDoc>) {}

  @Get()
  async export(@Res() res: Response) {
    const orders = Buffer.from(JSON.stringify(await this.orders.find().lean()));
    const photos = (await readdir(UPLOAD_DIR)).filter((name) => PHOTO.test(name));

    async function* archive() {
      yield tarHeader('orders.json', orders.length);
      yield orders;
      yield tarPadding(orders.length);
      for (const name of photos) {
        const data = await readFile(join(UPLOAD_DIR, name));
        yield tarHeader(`uploads/${name}`, data.length);
        yield data;
        yield tarPadding(data.length);
      }
      yield TAR_END;
    }

    res.set({
      'Content-Type': 'application/x-tar',
      'Content-Disposition': `attachment; filename="sph-backup-${new Date().toISOString().slice(0, 10)}.tar"`,
    });
    await pipeline(Readable.from(archive()), res);
  }

  /** Body: the tar itself (Content-Type application/x-tar), streamed, not a form upload. */
  @Post('import')
  async import(@Req() req: Request): Promise<ImportResult> {
    const result: ImportResult = {
      ordersAdded: 0,
      ordersSkipped: 0,
      photosAdded: 0,
      photosSkipped: 0,
    };
    try {
      for await (const { name, data } of tarEntries(req)) {
        if (name === 'orders.json') {
          const orders = JSON.parse(data.toString('utf8')) as { _id: string }[];
          if (!Array.isArray(orders)) throw new Error('orders.json is not a list');
          for (const order of orders) {
            if (await this.orders.exists({ _id: order._id })) {
              result.ordersSkipped++;
            } else {
              // Schema-validated. timestamps: false keeps the original created/updated dates.
              await new this.orders(order).save({ timestamps: false });
              result.ordersAdded++;
            }
          }
        } else if (name.startsWith('uploads/') && PHOTO.test(name.slice(8))) {
          try {
            await writeFile(join(UPLOAD_DIR, name.slice(8)), data, { flag: 'wx' });
            result.photosAdded++;
          } catch (e) {
            if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e;
            result.photosSkipped++;
          }
        }
      }
    } catch (e) {
      // Whatever was added before the error stays; importing the same file again is safe.
      throw new BadRequestException(`Import stopped: ${(e as Error).message}`);
    }
    return result;
  }
}
