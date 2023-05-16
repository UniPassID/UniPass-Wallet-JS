export interface UnipassStorage {
  getItem(key: string): Promise<string | undefined>;
  removeItem(key: string): Promise<void>;
  setItem(key: string, value: string): Promise<void>;
}

export type WalletInfo = {
  keyset: string;
  userKey: string;
  unipassServerUrl: string;
  authorization: string;
  rpcUrl: string;
  unipassRelayerUrl: string;
};
