import { IStorage, UniPassJwtSignerStorageInfo } from "../interface";

export class UniPassJwtSignerStorage {
  constructor(public readonly storage: IStorage) {}

  private static getKey(key: string): string {
    return `unipass-jwt-signer-${key}`;
  }

  private static getUniPassSignerItemKey(): string {
    return UniPassJwtSignerStorage.getKey(`info`);
  }

  public async getUniPassJwtSignerInfo(): Promise<UniPassJwtSignerStorageInfo | undefined> {
    const v = await this.storage.getItem(UniPassJwtSignerStorage.getUniPassSignerItemKey());
    if (v) {
      return JSON.parse(v);
    }
    return undefined;
  }

  public async updateUniPassJwtSignerInfo(info: UniPassJwtSignerStorageInfo): Promise<void> {
    return this.storage.setItem(UniPassJwtSignerStorage.getUniPassSignerItemKey(), JSON.stringify(info));
  }
}
