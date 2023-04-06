import { AccountInfo, AuditStatus, SignType } from "./interface/index";
import { arrayify, Bytes, concat, keccak256, toUtf8Bytes, hexlify, hashMessage } from "ethers/lib/utils";
import { BigNumber, constants, ethers } from "ethers";
import { Keyset } from "@unipasswallet/keys";
import { digestTxHash, Transaction } from "@unipasswallet/transactions";
import { CallTxBuilder } from "@unipasswallet/transaction-builders";
import {
  IPermit,
  RawBundledExecuteCall,
  RawMainExecuteCall,
  RawMainExecuteTransaction,
  digestPermitMessage,
} from "@unipasswallet/wallet";
import { SimulateResult } from "@unipasswallet/relayer";
import api from "./api/backend";
import WalletError from "./constant/error_map";
import { ChainType, TransactionFee, UnipassWalletProps, UniTransaction } from "./interface/unipassWalletProvider";
import { WalletsCreator, getAuthNodeChain } from "./utils/unipass";
import { ADDRESS_ZERO } from "./constant";
import { clearUpSignToken, getAccountInfo } from "./utils/storages";
import UnipassWalletProvider from "./index";

export type OperateTransaction = {
  deployTx?: Transaction;
  syncAccountExecute?: RawMainExecuteCall;
  callExecute?: RawMainExecuteCall;
};

export const operateToRawExecuteCall = async (
  operateTransaction: OperateTransaction,
): Promise<RawBundledExecuteCall | RawMainExecuteCall> => {
  const { deployTx, syncAccountExecute, callExecute } = operateTransaction;

  const user = await getUser();

  let rawExecute: RawBundledExecuteCall | RawMainExecuteCall;
  if (deployTx) {
    rawExecute = new RawBundledExecuteCall(deployTx);
  }
  if (syncAccountExecute) {
    const transaction = new RawMainExecuteTransaction({ rawExecuteCall: syncAccountExecute, target: user.address });
    if (rawExecute) {
      rawExecute = rawExecute.pushTransaction(transaction);
    } else {
      rawExecute = new RawBundledExecuteCall(transaction);
    }
  }

  if (rawExecute && callExecute) {
    const transaction = new RawMainExecuteTransaction({ rawExecuteCall: callExecute, target: user.address });
    return rawExecute.pushTransaction(transaction);
  }

  if (rawExecute) {
    return rawExecute;
  }

  if (callExecute) {
    return callExecute;
  }

  throw new Error(`Unknown operate transaction: ${operateTransaction}`);
};

export const innerGenerateTransferTx = async (input: {
  tx?: UniTransaction;
  addHookTx?: UniTransaction;
  chainType: ChainType;
  config: UnipassWalletProps;
  keyset: Keyset;
  fee?: TransactionFee;
  isAddHook?: boolean;
}): Promise<OperateTransaction> => {
  const { tx, chainType, config, keyset, fee } = input;
  const user = await getUser();
  const instance = WalletsCreator.getInstance(keyset, user.address, config);
  const wallet = instance[chainType];
  let nonce = await wallet.getNonce();

  let deployTx: Transaction;
  let syncAccountExecute: RawMainExecuteCall;

  if (chainType !== "polygon") {
    const {
      data: { transactions = [], isNeedDeploy },
    } = await api.syncTransaction({
      email: user.email,
      authChainNode: getAuthNodeChain(config.env, chainType),
    });
    transactions.forEach((v, i) => {
      transactions[i] = { ...v, gasLimit: BigNumber.from(v.gasLimit._hex), value: BigNumber.from(v.value._hex) };
    });
    if (transactions.length === 1) {
      if (isNeedDeploy) {
        transactions[0].gasLimit = constants.Zero;
        transactions[0].revertOnError = true;
        [deployTx] = transactions;
      } else {
        nonce = nonce.add(1);
        syncAccountExecute = new RawMainExecuteCall(transactions, nonce, []);
      }
    } else if (transactions.length === 2) {
      transactions[0].gasLimit = constants.Zero;
      transactions[1].gasLimit = constants.Zero;
      transactions[0].revertOnError = true;
      transactions[1].revertOnError = true;
      let syncAccountTx: Transaction;
      [deployTx, syncAccountTx] = transactions;
      nonce = nonce.add(1);
      syncAccountExecute = new RawMainExecuteCall(syncAccountTx, nonce, []);
    }
  }

  let callExecute: RawMainExecuteCall | undefined;

  if (tx) {
    const { revertOnError = true, gasLimit = BigNumber.from("0"), target, value, data = "0x00" } = tx;

    const callTx = new CallTxBuilder(revertOnError, gasLimit, target, value, data).build();
    nonce = nonce.add(1);
    callExecute = new RawMainExecuteCall(callTx, nonce, [0], preSignFunc);
  }

  const feeTx = fee ? getFeeTx(fee.receiver, fee.token, fee.value) : undefined;

  if (feeTx) {
    if (callExecute) {
      callExecute = callExecute.pushTransaction(feeTx);
    } else {
      nonce = nonce.add(1);
      callExecute = new RawMainExecuteCall(feeTx, nonce, [0], preSignFunc);
    }
  }

  return { deployTx, syncAccountExecute, callExecute };
};

const preSignFunc = async (chainId: number, address: string, txs: Transaction[], nonce: BigNumber) => {
  const {
    data: { approveStatus },
  } = await api.tssAudit({
    type: SignType.PersonalSign,
    content: JSON.stringify({
      chainId,
      address,
      txs,
      nonce: nonce.toNumber(),
    }),
    msg: digestTxHash(chainId, address, nonce.toNumber(), txs),
  });
  clearUpSignToken();
  return approveStatus === AuditStatus.Approved;
};

export const getFeeTx = (to: string, feeToken: string, feeValue: BigNumber) => {
  let feeTx: Transaction;

  if (feeToken !== ADDRESS_ZERO) {
    const erc20Interface = new ethers.utils.Interface(["function transfer(address _to, uint256 _value)"]);
    const tokenData = erc20Interface.encodeFunctionData("transfer", [to, feeValue]);
    feeTx = new CallTxBuilder(true, BigNumber.from(0), feeToken, BigNumber.from(0), tokenData).build();
  } else {
    feeTx = new CallTxBuilder(true, BigNumber.from(0), to, feeValue, "0x").build();
  }
  return feeTx;
};

export const innerSimulateExecute = async (
  tx: OperateTransaction,
  chainType: ChainType,
  config: UnipassWalletProps,
): Promise<SimulateResult> => {
  const user = await getUser();
  const keyset = Keyset.fromJson(user.keyset.keysetJson);
  const instance = WalletsCreator.getInstance(keyset, user.address, config);
  const wallet = instance[chainType];

  const rawExecute = await operateToRawExecuteCall(tx);

  return wallet.simulateExecute(rawExecute);
};

export const sendTransaction = async (
  tx: RawMainExecuteCall | RawBundledExecuteCall,
  chainType: ChainType,
  config: UnipassWalletProps,
  keyset: Keyset,
) => {
  const user = await getUser();

  const instance = WalletsCreator.getInstance(keyset, user.address, config);
  const wallet = instance[chainType];

  const ret = await wallet.sendTransactions(tx);
  return ret;
};

export const unipassMessagePrefix = "\x18UniPass Signed Message:\n";

export function unipassHashMessage(message: Bytes | string): string {
  if (typeof message === "string") {
    message = toUtf8Bytes(message);
  }
  return keccak256(concat([toUtf8Bytes(unipassMessagePrefix), toUtf8Bytes(String(message.length)), message]));
}

const genSignMessage = async (message: string, config: UnipassWalletProps, keyset: Keyset, isEIP191Prefix = false) => {
  const user = await getUser();
  const wallet = WalletsCreator.getInstance(keyset, user.address, config).polygon;
  const _message = isEIP191Prefix ? hashMessage(message) : unipassHashMessage(message);

  const auditRes = await api.tssAudit({
    type: SignType.PersonalSign,
    content: message,
    msg: _message,
  });
  clearUpSignToken();
  if (auditRes.data.approveStatus === AuditStatus.Approved) {
    const signedMessage = await wallet.signMessage(arrayify(_message), [0]);
    return signedMessage;
  } else if (auditRes.data.approveStatus === AuditStatus.Confirming) {
    throw new Error("SignRequestConfirming");
  } else if (auditRes.data.approveStatus === AuditStatus.Rejected) {
    throw new Error("SignRequestRejected");
  }
};

const genSignTypedDataMessage = async (data: any, message: Uint8Array, config: UnipassWalletProps, keyset: Keyset) => {
  const user = await getUser();
  const wallet = WalletsCreator.getInstance(keyset, user.address, config).polygon;
  const auditRes = await api.tssAudit({
    type: SignType.EIP712Sign,
    content: JSON.stringify(data),
    msg: hexlify(message),
  });
  clearUpSignToken();
  if (auditRes.data.approveStatus === AuditStatus.Approved) {
    const signedMessage = await wallet.signMessage(message, [0]);
    return signedMessage;
  } else if (auditRes.data.approveStatus === AuditStatus.Confirming) {
    throw new Error("SignRequestConfirming");
  } else if (auditRes.data.approveStatus === AuditStatus.Rejected) {
    throw new Error("SignRequestRejected");
  }
};

const verifySignature = async (message: string, sig: string, config: UnipassWalletProps) => {
  const user = await getUser();
  const keyset = Keyset.fromJson(user.keyset.keysetJson);
  const wallet = WalletsCreator.getInstance(keyset, user.address, config).polygon;
  const signedMessage = await wallet.isValidSignature(arrayify(unipassHashMessage(message)), sig);
  return signedMessage;
};

const getWallet = async (config: UnipassWalletProps, chainType: ChainType) => {
  const user = await getUser();
  const keyset = Keyset.fromJson(user.keyset.keysetJson);
  const wallet = WalletsCreator.getInstance(keyset, user.address, config)[chainType];
  return wallet;
};

const checkLocalStatus = async (config: UnipassWalletProps) => {
  try {
    const user = await getUser();
    const keyset = Keyset.fromJson(user.keyset.keysetJson);
    const wallet = WalletsCreator.getInstance(keyset, user.address, config).polygon;
    const isLogged = await wallet.isSyncKeysetHash();
    if (isLogged) {
      return user.email;
    }
  } catch (err) {
    if (err instanceof WalletError && (err.code === 403002 || err.code === 402007)) return false;

    throw err;
  }
};

const getUser = async (): Promise<AccountInfo | undefined> => {
  const cachedAccountInfo = UnipassWalletProvider.getInstance().getAccountInfo();
  if (cachedAccountInfo) {
    return cachedAccountInfo;
  }
  const accountInfo = await getAccountInfo();

  if (accountInfo) return accountInfo;

  throw new WalletError(402007);
};

const innerGeneratePermit = async (
  sessionKeyAddr: string,
  keyset: Keyset,
  config: UnipassWalletProps,
  timestamp: number,
  weight: number,
): Promise<IPermit> => {
  const user = await getUser();
  const instance = WalletsCreator.getInstance(keyset, user.address, config);
  const wallet = instance.polygon;

  const permitDigestHash = digestPermitMessage(wallet.address, sessionKeyAddr, timestamp, weight);

  // FIXME: Session Key tss Audit context
  const auditRes = await api.tssAudit({
    type: SignType.PersonalSign,
    content: JSON.stringify({
      address: wallet.address,
      sessionKeyAddr,
      timestamp,
      weight,
    }),
    msg: permitDigestHash,
  });
  clearUpSignToken();
  if (auditRes.data.approveStatus === AuditStatus.Confirming) {
    throw new Error("SessionKey Permit Signing Failed: Confirming");
  } else if (auditRes.data.approveStatus === AuditStatus.Rejected) {
    throw new Error("SessionKey Permit Signing Failed:: Rejected");
  }

  const permit = await wallet.signPermit(permitDigestHash, [0]);
  return {
    timestamp,
    weight,
    permit,
  };
};

export { genSignMessage, genSignTypedDataMessage, checkLocalStatus, verifySignature, getWallet, innerGeneratePermit };
