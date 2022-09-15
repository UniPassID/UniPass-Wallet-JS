import dayjs from "dayjs";
import { Keyset } from "@unipasswallet/wallet";
import Tss, { SIG_PREFIX } from "./utils/tss";
import api from "./api/backend";
import blockchain from "./api/blockchain";
import { checkEmailFormat, checkPassword, formatPassword } from "./utils/rules";
import { AuthType, OtpAction, SignUpAccountInput, User } from "./interface";
import { generateKdfPassword, signMsg } from "./utils/cloud-key";
import WalletError from "./constant/error_map";
import { generateSessionKey } from "./utils/session-key";
import { getAccountKeysetJson } from "./utils/rbac";
import DB from "./utils/db";
import UnipassWalletProvider from ".";

const getVerifyCode = async (email: string, action: OtpAction, mailServices: Array<string>) => {
  checkEmailFormat(email, mailServices);
  await api.sendOtpCode({ email, action, authType: AuthType.Email });
};

const verifyOtpCode = async (email: string, code: string, action: OtpAction, mailServices: Array<string>) => {
  checkEmailFormat(email, mailServices);
  const { data } = await api.verifyOtpCode({ email, code, action, authType: AuthType.Email });
  return data.upAuthToken;
};

const doRegister = async (
  password: string,
  email: string,
  upAuthToken: string,
  policyAddress: string,
  provider: UnipassWalletProvider,
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
  // TODO
  const accountAddress = await blockchain.generateAccountAddress(keysetHash, provider);
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
    },
    committed: false,
    step: "register",
  };
  console.log("register success", user);
  await DB.setUser(user);
};

const getPasswordToken = async (email: string, password: string) => {
  const kdfPassword = generateKdfPassword(password);
  const { data } = await api.getPasswordToken({ email, kdfPassword, captchaToken: "" });
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
    },
    committed: true,
  };
  console.log("login success", user);
  await DB.setUser(user);
};

const doLogout = async (email: string) => {
  await DB.delUser(email ?? "");
};

const getAccountAddress = async (email: string) => {
  const user = await DB.getUser(email ?? "");
  return user?.account || "";
};

// const hasLogged = async () => {
//   const users = await DB.getUsers();
//   const email = window.localStorage.getItem("email");
//   if (users.length > 0) {
//     const user = email ? users.find((e) => e.email === email) : users[0];
//     if (user) {
//       // check login
//       if (dayjs.unix(user.sessionKey.expires).isAfter(dayjs())) {
//         const resKeysetHash = await blockchain.getAccountKeysetHash(user.account);

//         if (
//           resKeysetHash === user.keyset.hash ||
//           // todo no keysetHash
//           resKeysetHash === "0x0000000000000000000000000000000000000000000000000000000000000000"
//         ) {
//           await DB.setUser(user);
//         }
//       }
//     }
//   }
// };

export { getVerifyCode, verifyOtpCode, doRegister, getPasswordToken, doLogin, doLogout, getAccountAddress };
