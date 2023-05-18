import { IStorage, MpcSignerInfo } from "./interface";

export class MpcStorage {
  constructor(public readonly storage: IStorage) {}

  private static getKey(key: string): string {
    return `unipass-mpc-${key}`;
  }

  private static getMpcSignerItemKey(): string {
    return MpcStorage.getKey(`signer-info`);
  }

  public async getMpcSignerInfo(): Promise<MpcSignerInfo | undefined> {
    const v = await this.storage.getItem(MpcStorage.getMpcSignerItemKey());
    if (v) {
      return JSON.parse(v);
    }
    return undefined;
  }

  public async updateMpcSignerInfo(mpcSignerInfo: MpcSignerInfo): Promise<void> {
    return this.storage.setItem(MpcStorage.getMpcSignerItemKey(), JSON.stringify(mpcSignerInfo));
  }
}
