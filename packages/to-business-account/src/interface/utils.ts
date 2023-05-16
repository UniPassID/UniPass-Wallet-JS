export type UnipassToBusinessError<T> = {
  code: number;
  message: string;
  data: T;
};

export enum UnipassToBusinessResCode {
  UnknownError = 1000,
  Web3AuthLoginFailed = 2000,
  InvalidIdToken = 3000,
}
