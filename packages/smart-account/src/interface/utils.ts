export interface SmartAccountError<T> extends Error {
  code: SmartAccountErrorCode;
  message: string;
  data: T;
}

export enum SmartAccountErrorCode {
  UnknownError = 1000,
  Web3AuthLoginFailed = 2000,
  InvalidIdToken = 3000,
  MpcServerError = 4000,
  MpcAuthorizationExpired = 4001,
  MpcStorageMissing = 4002,
  MpcInitFailed = 4003,
}

export enum Environment {
  Dev = "dev",
  Testnet = "testnet",
  Production = "prod",
}
