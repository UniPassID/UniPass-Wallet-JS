import { BigNumber, BytesLike } from "ethers";

export enum CallType {
  Call,
  DelegateCall,
  CallAccountLayer,
  CallHooks,
}

export enum GenerateSigType {
  SignByMasterKey = 0,
  SignByRecoveryEmail = 1,
  signByMasterKeyWithDkimParams = 2,
  SignBySessionKey = 3,
  SignNone = 4,
}

export class Transaction {
  constructor(
    public callType: CallType,
    public gasLimit: BigNumber,
    public target: BytesLike,
    public value: BigNumber,
    public data: BytesLike
  ) {}
}
