import jwt_decode from "jwt-decode";
import { AccountInfo } from "../interface";

export enum OAuthProvider {
  GOOGLE,
  AUTH0,
}

interface UnipassInfo {
  keyset: string;
  address: string;
  keystore: string;
}

export interface OAuthUserInfo {
  sub: string;
  email: string;
  id_token: string;
  oauth_provider: OAuthProvider;
  authorization: string;
  expires_at: string;
  up_sign_token?: string;
  unipass_info?: UnipassInfo;
}

const getOAuthUserInfo = () => {
  try {
    const _local_user_info = localStorage.getItem("__oauth_info");
    if (!_local_user_info) {
      return;
    }
    return JSON.parse(_local_user_info) as OAuthUserInfo;
  } catch (e) {
    //
  }
};

const getUpSignToken = () => {
  const oauthUserInfo = getOAuthUserInfo();
  if (!oauthUserInfo) {
    return "";
  }

  const { up_sign_token } = oauthUserInfo;
  return up_sign_token;
};

export const clearUpSignToken = () => {
  const oauthUserInfo = getOAuthUserInfo();
  if (!oauthUserInfo) {
    return undefined;
  }
  const { up_sign_token = "" } = oauthUserInfo;
  const decoded = jwt_decode(up_sign_token) as any;
  if (decoded && decoded.isDisposable) {
    localStorage.setItem("__oauth_info", JSON.stringify({ ...oauthUserInfo, up_sign_token: undefined }));
  }
};

const getAccountInfo = () => {
  try {
    const _account_info = localStorage.get("__account_info");
    if (!_account_info) {
      return;
    }
    return JSON.parse(_account_info) as AccountInfo;
  } catch (e) {
    return undefined;
  }
};

export { getOAuthUserInfo, getUpSignToken, getAccountInfo };
