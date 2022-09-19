import dayjs from "dayjs";
import { BigNumber, ethers } from "ethers";
import { SessionKey } from "@unipasswallet/wallet";
import { Keyset } from "@unipasswallet/keys";
import { toTransaction, Transaction, SignedTransactions } from "@unipasswallet/transactions";
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
import { ChainType, Environment, TransactionFee, UniTransaction } from "./interface/unipassWalletProvider";
import { genSessionKeyPermit, genWallets, getAuthNodeChain } from "./utils/unipass";
import { ADDRESS_ZERO } from "./constant";

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
  env: Environment,
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

  const wallet = genWallets(keyset, env).polygon;
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
      keysetJson: keyset.toJson(),
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
  const user = await DB.getUser(email ?? "");
  if (user) {
    const sessionKeyPermit = await genSessionKeyPermit(user, "QUERY_SYNC_STATUS");
    await api.syncEmail({ email, sessionKeyPermit, authChainNode: getAuthNodeChain(env, chainType) });
  } else {
    throw new WalletError(402007);
  }
};

const checkAccountStatus = async (email: string, chainType: ChainType, env: Environment) => {
  checkEmailFormat(email);
  const user = await DB.getUser(email ?? "");
  if (user) {
    const sessionKeyPermit = await genSessionKeyPermit(user, "QUERY_SYNC_STATUS");
    const {
      data: { syncStatus, upAuthToken },
    } = await api.accountStatus({
      email,
      authChainNode: getAuthNodeChain(env, chainType),
      sessionKeyPermit,
    });
    console.log(`syncStatus: ${syncStatus}`);
    return syncStatus;
  }
  throw new WalletError(402007);
};

const genTransaction = async (
  tx: UniTransaction,
  _email: string,
  chainType: ChainType,
  env: Environment,
  fee?: TransactionFee,
) => {
  const users = await DB.getUsers();
  const email = _email || window.localStorage.getItem("email");
  if (users.length > 0) {
    const user = email ? users.find((e) => e.email === email) : users[0];
    if (user) {
      const txs: Array<Transaction> = [];
      const { revertOnError = true, gasLimit = BigNumber.from("0"), target, value, data = "0x00" } = tx;
      txs.push(new CallTxBuilder(revertOnError, gasLimit, target, value, data).build());
      if (fee) {
        const { token, value: tokenValue } = fee;
        if (token !== ADDRESS_ZERO) {
          const erc20Interface = new ethers.utils.Interface(["function transfer(address _to, uint256 _value)"]);
          const tokenData = erc20Interface.encodeFunctionData("transfer", [target, tokenValue]);
          txs.push(new CallTxBuilder(true, BigNumber.from(0), token, BigNumber.from(0), tokenData).build());
        } else {
          txs.push(new CallTxBuilder(true, BigNumber.from(0), target, tokenValue, "0x").build());
        }
      }
      const keyset = Keyset.fromJson(user.keyset.keysetJson);
      const wallet = genWallets(keyset, env, user.account)[chainType];
      const sessionkey = await SessionKey.fromSessionKeyStore(users[0].sessionKey, wallet, decryptSessionKey);
      if (chainType !== "polygon") {
        const syncStatus = await checkAccountStatus(email, chainType, env);
        const sessionKeyPermit = await genSessionKeyPermit(user, "GET_SYNC_TRANSACTION");
        if (syncStatus === SyncStatusEnum.ServerSynced) {
          const serverTxs: Array<Transaction | SignedTransactions> = [];
          const {
            data: { transactions = [] },
          } = await api.syncTransaction({ email, sessionKeyPermit, authChainNode: getAuthNodeChain(env, chainType) });
          if (transactions.length === 1) {
            const { revertOnError, gasLimit, target, value, data } = transactions[0];
            const syncBuilder = new CallTxBuilder(
              revertOnError,
              BigNumber.from(gasLimit._hex),
              target,
              BigNumber.from(value._hex),
              data,
            ).build();
            const signedBuilder = (await wallet.signTransactions([syncBuilder], [])) as SignedTransactions;
            serverTxs.push(toTransaction(signedBuilder, wallet.address));
          } else if (transactions.length === 2) {
            const { revertOnError, gasLimit, target, value, data } = transactions[0];
            const deployBuilder = new CallTxBuilder(
              revertOnError,
              BigNumber.from(gasLimit._hex),
              target,
              BigNumber.from(value._hex),
              data,
            ).build();
            serverTxs.push(deployBuilder);

            const syncBuilder = new CallTxBuilder(
              transactions[1].revertOnError,
              BigNumber.from(transactions[1].gasLimit._hex),
              transactions[1].target,
              BigNumber.from(transactions[1].value._hex),
              transactions[1].data,
            ).build();
            const signedBuilder = (await wallet.signTransactions([syncBuilder], [])) as SignedTransactions;
            serverTxs.push(toTransaction(signedBuilder, wallet.address));
          }

          const txBundle = await wallet.signTransactions(txs, sessionkey, 1);
          console.log(wallet);
          console.log(wallet.address);

          const bundleTransaction = toTransaction(txBundle as SignedTransactions, wallet.address);
          console.log("[bundleTransaction2]");
          console.log(bundleTransaction);
          serverTxs.push(bundleTransaction);
          console.log("[genTransaction]");
          console.log(serverTxs);
          const transaction = await wallet.sendTransaction(serverTxs, "BUNDLED");
          const transactionReceipt = await transaction.wait();
          console.log(transactionReceipt);
          return transactionReceipt;
        }
        if (syncStatus === SyncStatusEnum.NotReceived) {
          throw new WalletError(403001);
        } else if (syncStatus === SyncStatusEnum.NotSynced) {
          throw new WalletError(403002);
        }
      }
      console.log("[genTransaction1]");
      console.log(txs);
      const transaction = await wallet.sendTransaction(txs, sessionkey);
      const transactionReceipt = await transaction.wait();
      console.log(transactionReceipt);
      return transactionReceipt;
    }
  } else {
    throw new WalletError(402007);
  }
};

const genSignMessage = async (message: string, _email: string, env: Environment) => {
  const users = await DB.getUsers();
  const email = _email || window.localStorage.getItem("email");
  if (users.length > 0) {
    const user = email ? users.find((e) => e.email === email) : users[0];
    if (user) {
      const keyset = Keyset.fromJson(user.keyset.keysetJson);
      const wallet = genWallets(keyset, env, user.account).polygon;
      const sessionkey = await SessionKey.fromSessionKeyStore(users[0].sessionKey, wallet, decryptSessionKey);
      const utf8Encode = new TextEncoder();
      const signedMessage = await wallet.signMessage(utf8Encode.encode(message), sessionkey);
      return signedMessage;
    }
  } else {
    throw new WalletError(402007);
  }
};

const getWallet = async (_email: string, env: Environment, authChainNode: ChainType) => {
  const users = await DB.getUsers();
  const email = _email || window.localStorage.getItem("email");
  if (users.length > 0) {
    const user = email ? users.find((e) => e.email === email) : users[0];
    if (user) {
      const keyset = Keyset.fromJson(user.keyset.keysetJson);
      const wallet = genWallets(keyset, env, user.account)[authChainNode];
      return wallet;
    }
  } else {
    throw new WalletError(402007);
  }
};

const checkLocalStatus = async (env: Environment) => {
  const users = await DB.getUsers();
  const email = window.localStorage.getItem("email");
  if (users.length > 0) {
    const user = email ? users.find((e) => e.email === email) : users[0];
    if (user) {
      if (dayjs.unix(user.sessionKey.expires).isAfter(dayjs())) {
        const keyset = Keyset.fromJson(user.keyset.keysetJson);
        const wallet = genWallets(keyset, env, user.account).polygon;
        const isLogged = await wallet.isSyncKeysetHash();
        console.log("isLogged");
        console.log(isLogged);

        if (isLogged) {
          return user.email;
        }
      }
    }
  }
};

const ckeckSyncStatus = async (_email: string, chainType: ChainType, env: Environment) => {
  const users = await DB.getUsers();
  const email = _email || window.localStorage.getItem("email");
  if (users.length > 0) {
    const status = await checkAccountStatus(email, chainType, env);
    if (status === SyncStatusEnum.NotReceived || status === SyncStatusEnum.NotSynced) return false;
    return status === SyncStatusEnum.Synced || status === SyncStatusEnum.ServerSynced;
  }
  throw new WalletError(402007);
};

export {
  getVerifyCode,
  verifyOtpCode,
  doRegister,
  getPasswordToken,
  doLogin,
  doLogout,
  syncEmail,
  genTransaction,
  genSignMessage,
  checkLocalStatus,
  ckeckSyncStatus,
  getWallet,
};
