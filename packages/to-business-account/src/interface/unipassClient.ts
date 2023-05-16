export enum UnipassSource {
  Sparkle = "sparkle",
}

export enum UnipassKeyType {
  ToBusiness = 5,
  ToBusinessEOA = 6,
}

export type AccountLogin = {
  authorization: string;
  isRegistered: boolean;
  unipassInfo?: {
    keyset: string;
    address: string;
    keystore: string;
    keyType: UnipassKeyType;
  };
};

export type RegisterParams = {
  keysetJson: string;
  masterKey: {
    masterKeyAddress: string;
    keystore: string;
    keyType: UnipassKeyType;
  };
};

export type AccountRegister = {
  authorization: string;
  unipassInfo: {
    keyset: string;
    address: string;
    keystore: string;
    keyType: UnipassKeyType;
  };
};

export type TssRes = {
  tssRes: TssKeyGenInner;
};

export interface TssKeyGenInner {
  userId: string;
  sessionId: string;
  msg: any;
}

export type TssKey = {
  tssKeyAddress: string;
  userId: string;
  userKeySignContext: string;
};

export type TssKeyGenParams = {
  sessionId: string;
  tssMsg: any;
};

export type TssKeyGenFinishParams = {
  userId: string;
  sessionId: string;
  tssKeyAddress: string;
};

export type ToBusinessConfig = {
  web3authConfig: {
    clientId: string;
    verifierName: string;
  };
  unipassRelayerUrl: string;
};

export type Fetch = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export enum UnipassRunningEnv {
  Dev = "dev",
  Testnet = "testnet",
}
