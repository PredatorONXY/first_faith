import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

export interface StorageProvider {
  save(buffer: Buffer, originalName: string): Promise<string>;
}

export class LocalStorageService implements StorageProvider {
  private readonly root = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads', 'products');

  async save(buffer: Buffer, originalName: string) {
    await mkdir(this.root, { recursive: true });
    const extension = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';
    const filename = `${randomUUID()}${extension}`;
    await writeFile(join(this.root, filename), buffer);
    return `/uploads/products/${filename}`;
  }
}
