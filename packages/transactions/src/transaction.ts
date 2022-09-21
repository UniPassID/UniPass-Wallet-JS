import { BigNumber, BytesLike, providers } from "ethers";
import { subDigest } from "@unipasswallet/utils";
import { defaultAbiCoder, keccak256 } from "ethers/lib/utils";

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
