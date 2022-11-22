import Dexie from "dexie";
import { getOAuthUserInfo } from "./storages";

export enum OAuthProvider {
  GOOGLE,
  AUTH0,
}

export interface AccountInfo {
  email: string;
  id_token: string;
  user_key: {
    encrypted_key: string;
    aes_key: CryptoKey;
  };
  address: string;
  oauth_provider: OAuthProvider;
  expires_at: string;
  keyset: {
    hash: string;
    masterKeyAddress: string;
    keysetJson: string;
  };
  keystore: string;
}

const dbName = "UniPassWalletIndexDB";
const db = new Dexie(dbName);
db.version(1).stores({ users: "email_provider" }); // aaa@gmail.com_0

interface DBProps {
  getAccountInfo: (exit?: boolean) => Promise<AccountInfo | undefined>;
  setAccountInfo: (account: AccountInfo) => Promise<void>;
  clearAccountInfo: () => Promise<void>;
}

const genUserKey = () => {
  const oauthUserInfo = getOAuthUserInfo();
  if (oauthUserInfo) {
    const { email, oauth_provider } = oauthUserInfo;
    return `${email}_${oauth_provider}`;
  }
  return "";
};

const DB: DBProps = {
  async getAccountInfo() {
    try {
      const _account_info = (await db.table("users").get(genUserKey())) as AccountInfo;
      if (!_account_info) {
        return;
      }
      return _account_info;
    } catch (err) {
      console.log(err);
    }
  },
  async setAccountInfo(account: AccountInfo) {
    try {
      await db.table("users").put({ ...account, email_provider: genUserKey() });
    } catch (err) {
      console.log(err);

      return undefined;
    }
  },
  async clearAccountInfo() {
    try {
      const res = await db.table("users").delete(genUserKey());
      return res;
    } catch (err) {
      return undefined;
    }
  },
};

export default DB;
