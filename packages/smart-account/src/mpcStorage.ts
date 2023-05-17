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

  // static getCurrentWalletIdentityKey() {
  //   return MpcStorage.getKey(`current-wallet-identity`);
  // }

  // async getCurrentWalletIdentity(): Promise<{ address: string; chainId: number } | undefined> {
  //   const key = MpcStorage.getCurrentWalletIdentityKey();
  //   const walletIdentity = await this.storage.getItem(key);
  //   if (walletIdentity) {
  //     return JSON.parse(walletIdentity);
  //   }
  //   return undefined;
  // }

  // async updateCurrentWalletIdentity(address: string, chainId: number): Promise<void> {
  //   return this.storage.setItem(
  //     MpcStorage.getCurrentWalletIdentityKey(),
  //     JSON.stringify({
  //       address,
  //       chainId,
  //     }),
  //   );
  // }

  // static getWalletInfoKey(address: string, chainId: number): string {
  //   return MpcStorage.getKey(`${chainId}-${address.toLowerCase()}-server-url`);
  // }

  // async getWalletInfo(address: string, chainId: number): Promise<WalletInfo | undefined> {
  //   const key = MpcStorage.getWalletInfoKey(address, chainId);
  //   const walletInfo = await this.storage.getItem(key);
  //   if (walletInfo) {
  //     return JSON.parse(walletInfo);
  //   }
  //   return undefined;
  // }

  // async updateWalletInfo(address: string, chainId: number, walletInfo: WalletInfo): Promise<void> {
  //   return this.storage.setItem(
  //     MpcStorage.getWalletInfoKey(address, chainId),
  //     JSON.stringify(walletInfo),
  //   );
  // }
}
