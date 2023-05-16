import { UnipassStorage } from "./storage";

export class UnipassToBusinessStorage {
  constructor(public readonly storage: UnipassStorage) {}

  private static getKey(key: string): string {
    return `unipass-to-business-${key}`;
  }

  static getCurrentWalletIdentityKey() {
    return UnipassToBusinessStorage.getKey(`current-wallet-identity`);
  }

  async getCurrentWalletIdentity(): Promise<{ address: string; chainId: number } | undefined> {
    const key = UnipassToBusinessStorage.getCurrentWalletIdentityKey();
    const walletIdentiry = await this.storage.getItem(key);
    if (walletIdentiry) {
      return JSON.parse(walletIdentiry);
    }
    return undefined;
  }

  async updateCurrentWalletIdentity(address: string, chainId: number): Promise<void> {
    return this.storage.setItem(
      UnipassToBusinessStorage.getCurrentWalletIdentityKey(),
      JSON.stringify({
        address,
        chainId,
      }),
    );
  }

  static getWalletInfoKey(address: string, chainId: number): string {
    return UnipassToBusinessStorage.getKey(`${chainId}-${address.toLowerCase()}-server-url`);
  }

  async getWalletInfo(address: string, chainId: number): Promise<WalletInfo | undefined> {
    const key = UnipassToBusinessStorage.getWalletInfoKey(address, chainId);
    const walletInfo = await this.storage.getItem(key);
    if (walletInfo) {
      return JSON.parse(walletInfo);
    }
    return undefined;
  }

  async updateWalletInfo(address: string, chainId: number, walletInfo: WalletInfo): Promise<void> {
    return this.storage.setItem(
      UnipassToBusinessStorage.getWalletInfoKey(address, chainId),
      JSON.stringify(walletInfo),
    );
  }
}

export type WalletInfo = {
  keyset: string;
  userKey: string;
  unipassServerUrl: string;
  authorization: string;
  rpcUrl: string;
  unipassRelayerUrl: string;
};
