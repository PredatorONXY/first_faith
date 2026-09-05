import { Global, Module } from '@nestjs/common';
import { LocalStorageService, STORAGE_PROVIDER } from './storage.service';

@Global()
@Module({
  providers: [
    LocalStorageService,
    { provide: STORAGE_PROVIDER, useExisting: LocalStorageService },
  ],
  exports: [STORAGE_PROVIDER, LocalStorageService],
})
export class StorageModule {}
