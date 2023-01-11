import { AccountInfo, AuditStatus, SignType } from "./interface/index";
import { arrayify, Bytes, concat, keccak256, toUtf8Bytes, hexlify, hashMessage } from "ethers/lib/utils";
import { BigNumber, constants, ethers } from "ethers";
import { Keyset } from "@unipasswallet/keys";
import { digestTxHash, Transaction } from "@unipasswallet/transactions";
import { CallTxBuilder } from "@unipasswallet/transaction-builders";
import { RawBundledExecuteCall, RawMainExecuteCall } from "@unipasswallet/wallet";
import { SimulateResult } from "@unipasswallet/relayer";
import api from "./api/backend";
import WalletError from "./constant/error_map";
import { ChainType, TransactionFee, UnipassWalletProps, UniTransaction } from "./interface/unipassWalletProvider";
import { WalletsCreator, getAuthNodeChain } from "./utils/unipass";
import { ADDRESS_ZERO } from "./constant";
import DB from "./utils/index_db";
import { clearUpSignToken } from "./utils/storages";

export type OperateTransaction = {
  deployTx?: Transaction;
  syncAccountExecute?: RawMainExecuteCall;
  callExecute: RawMainExecuteCall;
  feeTx?: Transaction;
};

export const operateToRawExecuteCall = (
  operateTransaction: OperateTransaction,
): RawBundledExecuteCall | RawMainExecuteCall => {
  const { deployTx, syncAccountExecute, callExecute: callExecuteCall, feeTx } = operateTransaction;

  let rawExecute: RawBundledExecuteCall | RawMainExecuteCall;
  if (deployTx) {
    rawExecute = new RawBundledExecuteCall(deployTx);
  }
  if (syncAccountExecute) {
    if (rawExecute) {
      rawExecute = rawExecute.pushTransaction(syncAccountExecute);
    } else {
      rawExecute = new RawBundledExecuteCall(syncAccountExecute);
    }
  }

  let callExecute = callExecuteCall;
  if (feeTx) {
    callExecute = callExecute.pushTransaction(feeTx);
  }

  if (rawExecute) {
    return rawExecute.pushTransaction(callExecute);
  }
  return callExecute;
};

export const innerGenerateTransferTx = async (
  tx: UniTransaction,
  chainType: ChainType,
  config: UnipassWalletProps,
  keyset: Keyset,
  fee: TransactionFee,
): Promise<OperateTransaction> => {
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
      [deployTx] = transactions;
      nonce = nonce.add(1);
      syncAccountExecute = new RawMainExecuteCall(transactions, nonce, []);
    }
  }
  const { revertOnError = true, gasLimit = BigNumber.from("0"), target, value, data = "0x00" } = tx;

  const callTx = new CallTxBuilder(revertOnError, gasLimit, target, value, data).build();
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

  nonce = nonce.add(1);
  const callExecute = new RawMainExecuteCall(callTx, nonce, [0], preSignFunc);

  const feeTx = fee ? getFeeTx(fee.receiver, fee.token, fee.value) : undefined;

  return { deployTx, syncAccountExecute, callExecute, feeTx };
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

  const rawExecute = operateToRawExecuteCall(tx);

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
  const accountInfo = await DB.getAccountInfo();

  if (accountInfo) {
    return accountInfo;
  }
  throw new WalletError(402007);
};

export { genSignMessage, genSignTypedDataMessage, checkLocalStatus, verifySignature, getWallet };
