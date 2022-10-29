import { arrayify, keccak256, parseEther, toUtf8Bytes } from "ethers/lib/utils";
import dayjs from "dayjs";
import { BigNumber, constants, ethers } from "ethers";
import { ExecuteTransaction, SessionKey, BundledTransaction, isBundledTransaction } from "@unipasswallet/wallet";
import { Keyset } from "@unipasswallet/keys";
import { Transaction, Transactionish } from "@unipasswallet/transactions";
import { CallTxBuilder } from "@unipasswallet/transaction-builders";
import Tss, { SIG_PREFIX } from "./utils/tss";
import api from "./api/backend";
import { checkEmailFormat, checkPassword, formatPassword } from "./utils/rules";
import { AuthType, OtpAction, SignUpAccountInput, SyncStatusEnum, User } from "./interface";
import { generateKdfPassword, signMsg } from "./utils/cloud-key";
import WalletError from "./constant/error_map";
import { decryptSessionKey, generateSessionKey } from "./utils/session-key";
import { getAccountKeysetJson } from "./utils/rbac";
import DB from "./utils/db";
import {
  ChainType,
  Environment,
  TransactionFee,
  UnipassWalletProps,
  UniTransaction,
} from "./interface/unipassWalletProvider";
import { genSessionKeyPermit, WalletsCreator, getAuthNodeChain } from "./utils/unipass";
import { ADDRESS_ZERO } from "./constant";
import { FeeOption, Relayer } from "@unipasswallet/relayer";

const getVerifyCode = async (email: string, action: OtpAction, mailServices: Array<string>) => {
  checkEmailFormat(email, mailServices);
  await api.sendOtpCode({ email, action, authType: AuthType.Email });
};

const verifyOtpCode = async (email: string, code: string, action: OtpAction, mailServices: Array<string>) => {
  checkEmailFormat(email, mailServices);
  const { data } = await api.verifyOtpCode({
    email,
    code,
    action,
    authType: AuthType.Email,
  });
  return data.upAuthToken;
};

const doRegister = async (
  password: string,
  email: string,
  upAuthToken: string,
  policyAddress: string,
  config: UnipassWalletProps,
) => {
  if (!email || !upAuthToken || !policyAddress) throw new WalletError(402004);
  // 1、verify password
  const formattedPsw = formatPassword(password);
  checkPassword(formattedPsw);
  const kdfPassword = generateKdfPassword(formattedPsw);
  // 2、生成localKeyData
  const pepper = Tss.createRandom();
  const localKeyData = await Tss.generateLocalKey(
    {
      email,
      upAuthToken,
      action: "signUp",
    },
    formattedPsw,
  );
  if (!localKeyData) throw new WalletError(402001);
  // 3. 获取accountAddress
  const keyset = getAccountKeysetJson(email, localKeyData.localKeyAddress, policyAddress, pepper);
  const keysetHash = keyset.hash();

  const wallet = WalletsCreator.getPolygonProvider(keyset, config.env);
  const accountAddress = wallet.address;
  if (!accountAddress) throw new WalletError(402002);
  const timestamp = dayjs().add(4, "hour").unix();
  // 4. 生成sessionKey
  const sessionKey = await generateSessionKey();
  // 5. 生成permit
  const permit = await Tss.generateTssPermit(
    email,
    localKeyData.upAuthToken,
    "signUp",
    localKeyData.keystore,
    localKeyData.localKeyAddress,
    formattedPsw,
    timestamp,
    sessionKey.address,
    100,
    accountAddress,
  );
  // 6 生成sessionKeyPermit
  const sig = await signMsg(SIG_PREFIX.UPLOAD + timestamp, sessionKey.privkey, false);
  console.log("[sig] sig", sig);

  const sessionKeyPermit = {
    timestamp,
    timestampNow: timestamp,
    permit,
    sessionKeyAddress: sessionKey.address,
    sig,
    weight: 100,
  };
  const signData: SignUpAccountInput = {
    email,
    pepper,
    upAuthToken: localKeyData.upAuthToken,
    keysetJson: keyset.toJson(),
    masterKey: {
      kdfPassword,
      masterKeyAddress: localKeyData.localKeyAddress,
      keyStore: localKeyData.keystore,
    },
    sessionKeyPermit,
  };
  // 7. 开始注册
  const { data } = await api.signUpAccount(signData);
  if (data.address !== accountAddress) throw new WalletError(402003);
  const user: User = {
    email,
    account: accountAddress,
    keyset: {
      hash: keysetHash,
      masterKeyAddress: localKeyData.localKeyAddress,
      keysetJson: keyset.obscure().toJson(),
    },
    sessionKey: {
      localKey: {
        keystore: sessionKey.encryptedKey,
        address: sessionKey.address,
      },
      aesKey: sessionKey.aesKey,
      authorization: permit,
      expires: timestamp,
      weight: 100,
    },
    committed: false,
    step: "register",
  };
  console.log("register success", user);
  await DB.setUser(user);
};

const getPasswordToken = async (email: string, password: string) => {
  const kdfPassword = generateKdfPassword(password);
  const { data } = await api.getPasswordToken({
    email,
    kdfPassword,
    captchaToken: "",
  });
  const { upAuthToken, pending } = data;

  if (pending) throw new WalletError(402005);
  if (!upAuthToken) throw new WalletError(402006);
  return upAuthToken;
};

const doLogin = async (email: string, password: string, upAuthToken: string, pwsToken: string) => {
  if (!email || !upAuthToken || !pwsToken) throw new WalletError(402004);
  const loginData = {
    email,
    upAuthToken: pwsToken,
    auth2FaToken: [
      {
        type: 0,
        upAuthToken,
      },
    ],
  };
  const { data: loginRes } = await api.loign(loginData);
  const { keystore, localKeyAddress, address, upAuthToken: token } = loginRes;
  const sessionKey = await generateSessionKey();
  const timestampNow = dayjs().add(1, "minute").unix();
  const sig = await signMsg(SIG_PREFIX.LOGIN + timestampNow, sessionKey.privkey, false);
  const timestamp = dayjs().add(4, "hour").unix();
  const permit = await Tss.generateTssPermit(
    email,
    token,
    "signIn",
    keystore,
    localKeyAddress,
    password,
    timestamp,
    sessionKey.address,
    100,
    address,
  );
  const { data: accountKeyset } = await api.queryAccountKeyset({
    email,
    upAuthToken: "",
    sessionKeyPermit: {
      timestamp,
      timestampNow,
      permit,
      sessionKeyAddress: sessionKey.address,
      sig,
      weight: 100,
    },
  });
  const { masterKeyAddress, accountAddress } = accountKeyset;
  const keyset = Keyset.fromJson(accountKeyset.keyset);
  const user: User = {
    email,
    account: accountAddress,
    keyset: {
      hash: keyset.hash(),
      masterKeyAddress,
      keysetJson: accountKeyset.keyset,
    },
    sessionKey: {
      localKey: {
        keystore: sessionKey.encryptedKey,
        address: sessionKey.address,
      },
      aesKey: sessionKey.aesKey,
      authorization: permit,
      expires: timestamp,
      weight: 100,
    },
    committed: true,
  };
  await DB.setUser(user);
};

const doLogout = async (email: string) => {
  await DB.delUser(email ?? "");
};

const syncEmail = async (email: string, chainType: ChainType, env: Environment) => {
  if (!email) throw new WalletError(402004);
  checkEmailFormat(email);
  const user = await getUser();
  const sessionKeyPermit = await genSessionKeyPermit(user, "QUERY_SYNC_STATUS");
  await api.syncEmail({ email, sessionKeyPermit, authChainNode: getAuthNodeChain(env, chainType) });
};

const checkAccountStatus = async (email: string, chainType: ChainType, env: Environment) => {
  checkEmailFormat(email);
  const user = await getUser();
  const sessionKeyPermit = await genSessionKeyPermit(user, "QUERY_SYNC_STATUS");
  const {
    data: { syncStatus },
  } = await api.accountStatus({
    email,
    authChainNode: getAuthNodeChain(env, chainType),
    sessionKeyPermit,
  });
  return syncStatus;
};

export type OperateTransaction = {
  deployTx?: Transaction;
  syncAccountTx?: ExecuteTransaction;
  transaction: Transaction;
};

export const innerGenerateTransferTx = async (
  tx: UniTransaction,
  chainType: ChainType,
  config: UnipassWalletProps,
): Promise<OperateTransaction> => {
  const user = await getUser();

  let deployTx: Transaction;
  let syncAccountTx: ExecuteTransaction;
  if (chainType !== "polygon") {
    const syncStatus = await checkAccountStatus(user.email, chainType, config.env);
    const sessionKeyPermit = await genSessionKeyPermit(user, "GET_SYNC_TRANSACTION");
    if (syncStatus === SyncStatusEnum.ServerSynced) {
      const {
        data: { transactions = [], isNeedDeploy },
      } = await api.syncTransaction({
        email: user.email,
        sessionKeyPermit,
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
          syncAccountTx = {
            type: "Execute",
            transactions,
            sessionKeyOrSignerIndex: [],
            gasLimit: constants.Zero,
          };
        }
      } else if (transactions.length === 2) {
        transactions[0].gasLimit = constants.Zero;
        transactions[1].gasLimit = constants.Zero;
        transactions[0].revertOnError = true;
        transactions[1].revertOnError = true;
        [deployTx] = transactions;
        syncAccountTx = {
          type: "Execute",
          transactions: transactions[1],
          sessionKeyOrSignerIndex: [],
          gasLimit: constants.Zero,
        };
      }
    }
    if (syncStatus === SyncStatusEnum.NotReceived) {
      throw new WalletError(403001);
    } else if (syncStatus === SyncStatusEnum.NotSynced) {
      throw new WalletError(403001);
    }
  }
  const { revertOnError = true, gasLimit = BigNumber.from("0"), target, value, data = "0x00" } = tx;
  const transaction = new CallTxBuilder(revertOnError, gasLimit, target, value, data).build();

  return { deployTx, syncAccountTx, transaction };
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

export const getFeeTxByGasLimit = async (feeToken: string, gasLimit: BigNumber, relayer: Relayer) => {
  const feeOption = await getFeeOption(gasLimit, feeToken, relayer);
  const { to: receiver, amount: feeAmount } = feeOption as FeeOption;
  const feeTx = getFeeTx(receiver, feeToken, BigNumber.from(feeAmount));

  return feeTx;
};

export const getFeeOption = async (
  gasLimit: BigNumber,
  token: string,
  relayer: Relayer,
): Promise<FeeOption | Pick<FeeOption, "to">> => {
  const feeOptions = await relayer.getFeeOptions(gasLimit.toHexString());
  let feeOption: FeeOption | Pick<FeeOption, "to">;
  if (token === ADDRESS_ZERO) {
    feeOption = feeOptions.options.find(
      (x) =>
        !(x as FeeOption).token.contractAddress ||
        (x as FeeOption).token.contractAddress.toLowerCase() === token.toLowerCase(),
    );
  } else {
    feeOption = feeOptions.options.find(
      (x) =>
        !!(x as FeeOption).token.contractAddress &&
        (x as FeeOption).token.contractAddress.toLowerCase() === token.toLowerCase(),
    );
  }
  if (!feeOption) throw new Error(`un supported fee token ${token}`);

  return feeOption;
};

export const innerEstimateTransferGas = async (
  tx: OperateTransaction,
  chainType: ChainType,
  config: UnipassWalletProps,
  fee?: TransactionFee,
): Promise<ExecuteTransaction | BundledTransaction> => {
  const user = await getUser();
  const keyset = Keyset.fromJson(user.keyset.keysetJson);
  const instance = WalletsCreator.getInstance(keyset, user.account, config);
  const wallet = instance[chainType];
  const gasEstimator = instance[`${chainType}GasEstimator`];
  const nonce = await wallet.relayer.getNonce(wallet.address);

  const sessionkey = await SessionKey.fromSessionKeyStore(user.sessionKey, wallet, decryptSessionKey);
  const { deployTx, syncAccountTx } = tx;
  const { transaction } = tx;

  let feeValue: BigNumber | undefined;
  let feeTx: Transaction;
  if (fee) {
    const { token, value: tokenValue } = fee;
    if (tokenValue.eq(0)) {
      feeValue = tokenValue;
      feeTx = await getFeeTxByGasLimit(token, constants.One, wallet.relayer);
    } else {
      const feeOption = await getFeeOption(constants.One, token, wallet.relayer);
      const { to } = feeOption as FeeOption;
      feeTx = getFeeTx(to, token, tokenValue);
    }
  }

  let transferExecuteTx: ExecuteTransaction;
  if (!feeTx) {
    transferExecuteTx = {
      type: "Execute",
      transactions: [transaction],
      gasLimit: constants.Zero,
      sessionKeyOrSignerIndex: sessionkey,
    };
  } else {
    transferExecuteTx = {
      type: "Execute",
      transactions: [transaction, feeTx],
      gasLimit: constants.Zero,
      sessionKeyOrSignerIndex: sessionkey,
    };
  }

  let estimatedTxs;
  if (deployTx) {
    estimatedTxs = { type: "Bundled", transactions: [deployTx], gasLimit: constants.Zero };
  }
  if (syncAccountTx) {
    if (estimatedTxs) {
      estimatedTxs.transactions.push(syncAccountTx);
    } else {
      estimatedTxs = { type: "Bundled", transactions: [syncAccountTx], gasLimit: constants.Zero };
    }
  }

  if (estimatedTxs) {
    estimatedTxs.transactions.push(transferExecuteTx);
  } else {
    estimatedTxs = transferExecuteTx;
  }

  let gasLimit;
  if (chainType === "rangers") {
    gasLimit = parseEther("0.001");
  } else if (isBundledTransaction(estimatedTxs)) {
    estimatedTxs = await gasEstimator.estimateBundledTxGasLimits(estimatedTxs, nonce);
    gasLimit = estimatedTxs.gasLimit;
  } else {
    estimatedTxs = await gasEstimator.estimateExecuteTxsGasLimits(estimatedTxs, nonce);
    gasLimit = estimatedTxs.gasLimit;
  }

  if (feeValue && feeValue.eq(0)) {
    feeTx = await getFeeTxByGasLimit(fee.token, gasLimit, wallet.relayer!);
    transferExecuteTx.transactions[(transferExecuteTx.transactions as Transactionish[]).length - 1] = feeTx;
    if (isBundledTransaction(estimatedTxs)) {
      (estimatedTxs.transactions as (ExecuteTransaction | Transactionish)[])[
        (estimatedTxs.transactions as (ExecuteTransaction | Transactionish)[]).length - 1
      ] = transferExecuteTx;
    } else {
      estimatedTxs = transferExecuteTx;
    }
  }
  return estimatedTxs;
};

export const sendTransaction = async (
  tx: ExecuteTransaction | BundledTransaction,
  chainType: ChainType,
  config: UnipassWalletProps,
  feeToken?: string
) => {
  const user = await getUser();

  const keyset = Keyset.fromJson(user.keyset.keysetJson);
  const instance = WalletsCreator.getInstance(keyset, user.account, config);
  const wallet = instance[chainType];
  const sessionkey = await SessionKey.fromSessionKeyStore(user.sessionKey, wallet, decryptSessionKey);

  const ret = await (await wallet.sendTransaction(tx, sessionkey, feeToken, tx.gasLimit)).wait(1);
  return ret;
};

const genSignMessage = async (message: string, _email: string, config: UnipassWalletProps) => {
  const user = await getUser();
  const keyset = Keyset.fromJson(user.keyset.keysetJson);
  const wallet = WalletsCreator.getInstance(keyset, user.account, config).polygon;
  const sessionkey = await SessionKey.fromSessionKeyStore(user.sessionKey, wallet, decryptSessionKey);
  const signedMessage = await wallet.signMessage(arrayify(keccak256(toUtf8Bytes(message))), sessionkey);
  return signedMessage;
};

const verifySignature = async (message: string, sig: string, _email: string, config: UnipassWalletProps) => {
  const user = await getUser();
  const keyset = Keyset.fromJson(user.keyset.keysetJson);
  const wallet = WalletsCreator.getInstance(keyset, user.account, config).polygon;
  const signedMessage = await wallet.isValidSignature(arrayify(keccak256(toUtf8Bytes(message))), sig);
  return signedMessage;
};

const getWallet = async (_email: string, config: UnipassWalletProps, chainType: ChainType) => {
  const user = await getUser();
  const keyset = Keyset.fromJson(user.keyset.keysetJson);
  const wallet = WalletsCreator.getInstance(keyset, user.account, config)[chainType];
  return wallet;
};

const checkLocalStatus = async (config: UnipassWalletProps) => {
  try {
    const user = await getUser();
    const keyset = Keyset.fromJson(user.keyset.keysetJson);
    const wallet = WalletsCreator.getInstance(keyset, user.account, config).polygon;
    const isLogged = await wallet.isSyncKeysetHash();
    if (isLogged) {
      return user.email;
    }
    await DB.delUser(user.email);
  } catch (err) {
    if (err instanceof WalletError && (err.code === 403002 || err.code === 402007)) return false;

    throw err;
  }
};

const getUser = async (): Promise<User | undefined> => {
  const users = await DB.getUsers();
  const email = localStorage.getItem("email");
  if (users.length > 0 && email) {
    const user = users.find((e) => e.email === email);
    if (user && dayjs.unix(user.sessionKey.expires).isAfter(dayjs())) return user;
    await DB.delUser(email);
    throw new WalletError(403002);
  } else {
    throw new WalletError(402007);
  }
};

export {
  getVerifyCode,
  verifyOtpCode,
  doRegister,
  getPasswordToken,
  doLogin,
  doLogout,
  syncEmail,
  genSignMessage,
  checkLocalStatus,
  verifySignature,
  getWallet,
};
