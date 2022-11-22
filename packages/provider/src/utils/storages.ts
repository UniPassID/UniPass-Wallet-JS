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

export { getOAuthUserInfo };
