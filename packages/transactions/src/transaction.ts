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

export interface GuestTransactions {
  readonly _isGuestTransaction: true;
  txHash: BytesLike;
  transactions: Transaction[];
}

export function isGuestTransaction(v: any): v is GuestTransactions {
  return v._isGuestTransaction;
}

export interface SignedTransactions {
  readonly _isSignedTransactions: true;
  transactions: Transaction[];
  txHash: BytesLike;
  nonce: number;
  signature: BytesLike;
}

export function isSignedTransactions(v: any): v is SignedTransactions {
  return v._isSignedTransactions;
}

export function digestTxHash(
  chainId: number,
  walletAddr: BytesLike,
  nonce: number,
  transactions: Transaction[]
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
        [nonce, transactions]
      )
    )
  );
}

export function digestGuestTxHash(
  chainId: number,
  moduleGuestAddress: BytesLike,
  transactions: Transaction[]
): string {
  return subDigest(
    chainId,
    moduleGuestAddress,
    keccak256(
      defaultAbiCoder.encode(
        [
          "string",
          "tuple(uint8 callType,bool revertOnError,address target,uint256 gasLimit,uint256 value,bytes data)[]",
        ],
        ["guest:", transactions]
      )
    )
  );
}

export type Transactionish =
  | providers.TransactionRequest
  | providers.TransactionRequest[]
  | Transaction
  | Transaction[];

export function toTransactions(transactionish: Transactionish): Transaction[] {
  if (Array.isArray(transactionish)) {
    return transactionish.map((v): Transaction => {
      if (isUnipassWalletTransaction(v)) {
        return v;
      }

      return {
        _isUnipassWalletTransaction: true,
        callType: CallType.Call,
        revertOnError: false,
        gasLimit: BigNumber.from(v.gasLimit),
        target: v.to,
        value: BigNumber.from(v.value),
        data: v.data,
      };
    });
  }

  if (isUnipassWalletTransaction(transactionish)) {
    return [transactionish];
  }

  return [
    {
      _isUnipassWalletTransaction: true,
      callType: CallType.Call,
      revertOnError: false,
      gasLimit: BigNumber.from(transactionish.gasLimit),
      target: transactionish.to,
      value: BigNumber.from(transactionish.value),
      data: transactionish.data,
    },
  ];
}

export function isUnipassWalletTransaction(v: any): v is Transaction {
  return v._isUnipassWalletTransaction;
}
