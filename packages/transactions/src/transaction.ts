import { BigNumber, BytesLike, providers } from "ethers";
import { subDigest } from "@unipasswallet/utils";
import { defaultAbiCoder, hexlify, keccak256 } from "ethers/lib/utils";

export enum CallType {
  Call,
  DelegateCall,
}

export interface Transaction {
  readonly _isUnipassWalletTransaction: true;
  callType: CallType;
  revertOnError: boolean;
  gasLimit: BigNumber;
  target: BytesLike;
  value: BigNumber;
  data: BytesLike;
}

export function transactionToJson(tx: Transaction): string {
  return `{"_isUnipassWalletTransaction":true,"callType":${tx.callType},"revertOnError":${
    tx.revertOnError
  },"gasLimit":"${hexlify(tx.gasLimit)}","target":"${hexlify(tx.target)}","value":"${hexlify(
    tx.value,
  )}","data":"${hexlify(tx.data)}"}`;
}

export function transactionFromJsonObj(obj: any): Transaction {
  if (obj._isUnipassWalletTransaction !== true) {
    throw new Error("Expected _isUnipassWalletTransaction to be true");
  }

  return {
    _isUnipassWalletTransaction: true,
    callType: obj.callType as CallType,
    revertOnError: obj.revertOnError,
    gasLimit: BigNumber.from(obj.gasLimit),
    target: hexlify(obj.target),
    value: BigNumber.from(obj.value),
    data: hexlify(obj.data),
  };
}

export function isUnipassWalletTransaction(v: any): v is Transaction {
  return v._isUnipassWalletTransaction;
}

export type Transactionish = providers.TransactionRequest | Transaction;

export function toTransaction(transaction: Transactionish): Transaction {
  if (isUnipassWalletTransaction(transaction)) {
    return transaction;
  }

  return {
    _isUnipassWalletTransaction: true,
    callType: CallType.Call,
    revertOnError: false,
    gasLimit: BigNumber.from(transaction.gasLimit),
    target: transaction.to,
    value: BigNumber.from(transaction.value),
    data: transaction.data,
  };
}

export function toTransactions(transactions: Transactionish | Transactionish[]): Transaction[] {
  if (Array.isArray(transactions)) {
    return transactions.map((v) => toTransaction(v));
  } else {
    return [toTransaction(transactions)];
  }
}

export function digestTxHash(
  chainId: number,
  walletAddr: BytesLike,
  nonce: number,
  transactions: Transaction[],
): string {
  return subDigest(
    chainId,
    walletAddr,
    keccak256(
      defaultAbiCoder.encode(
        [
          "uint256",
          "tuple(uint8 callType,bool revertOnError,address target,uint256 gasLimit,uint256 value,bytes data)[]",
        ],
        [nonce, transactions],
      ),
    ),
  );
}

export function digestGuestTxHash(chainId: number, moduleGuestAddress: BytesLike, transactions: Transaction[]): string {
  return subDigest(
    chainId,
    moduleGuestAddress,
    keccak256(
      defaultAbiCoder.encode(
        [
          "string",
          "tuple(uint8 callType,bool revertOnError,address target,uint256 gasLimit,uint256 value,bytes data)[]",
        ],
        ["guest:", transactions],
      ),
    ),
  );
}
