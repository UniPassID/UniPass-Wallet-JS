// --- tss input output ----
export interface StartKeyGenInput {
  email: string;
  upAuthToken: string;
  action: string;
}

export interface LocalKeyData {
  localKeyAddress: string;
  userId: string;
  keystore: string;
  upAuthToken: string;
}

export interface StartKeygenData {
  keygenInput: KeyGenInput;
  context2: string;
}

export interface KeyGenInput {
  email: string;
  upAuthToken: string;
  sessionId: string;
  tssMsg: any;
  action: string;
}

export interface KeygenData {
  userId: string;
  sessionId: string;
  msg: any;
}

export interface GetKeygenData {
  signContext2: any;
  finishKeygenInput: FinishKeygenInput;
}

export interface FinishKeygenInput {
  email: string;
  upAuthToken: string;
  sessionId: string;
  userId: string;
  localKeyAddress: string;
  action: string;
}

export interface ApiResponse {
  statusCode: number;
}

interface MasterKey {
  kdfPassword: string;
  masterKeyAddress: string;
  keyStore: string;
}

interface SessionKeyPermit {
  timestamp: number;
  timestampNow: number;
  permit: string;
  sessionKeyAddress: string;
  sig: string;
  weight: number;
}

export interface GuardianData {
  email: string;
  isSelfGuardian: boolean;
}

// 2FA
// 0:Email | 1:Phone | 2:GoogleAuthenticator | 3:WebAuth
export enum AuthType {
  Email,
  Phone,
  GoogleAuthenticator,
  WebAuth,
}

// Permit
export enum SignerType {
  EIP712 = 1,
  EthSig = 2,
}

export type OtpAction =
  | "bindPhone"
  | "signUp"
  | "signIn"
  | "sendGuardian"
  | "sendRecoveryEmail"
  | "startRecoveryEmail"
  | "passwordLogin"
  | "auth2Fa"
  | "tssGenerate"
  | "tssSign";

export interface SuffixesOutput extends ApiResponse {
  data: {
    suffixes: string[];
    policyAddress: string;
  };
}

export interface SendOtpCodeInput {
  email: string;
  action: OtpAction;
  bindPhone?: {
    phone: string;
    areaCode: string;
  };
  authType: AuthType;
}

export interface VerifyOtpCodeInput {
  email: string;
  action: OtpAction;
  code: string;
  authType: AuthType;
}

export interface VerifyOtpCodeOutput extends ApiResponse {
  data: {
    upAuthToken: string;
  };
}

export interface SignInput {
  email: string;
  sessionId: string;
  upAuthToken: string;
  tssMsg: any;
  value: string;
  action: string;
}

export interface SignUpAccountInput {
  email: string;
  pepper: string;
  upAuthToken: string;
  keysetJson: string;
  masterKey: MasterKey;
  sessionKeyPermit: SessionKeyPermit | Record<string, never>;
}

export interface SignUpAccountOutput extends ApiResponse {
  data: {
    address: string;
    keysetHash: string;
  };
}

export interface StartSignInput {
  email: string;
  upAuthToken: string;
  localKeyAddress: string;
  tssMsg: any;
  value: string;
  action: string;
}

export interface SignInput {
  email: string;
  sessionId: string;
  upAuthToken: string;
  tssMsg: any;
  value: string;
  action: string;
}

export interface GetPasswordTokenInput {
  // register email
  email: string;
  kdfPassword: string;
  // google captchaToken
  captchaToken: string;
}

export interface Auth2FaCodeToken {
  type: number;
  upAuthToken: string;
}

export interface LoginInput {
  email: string;
  upAuthToken: string;
  auth2FaToken: Auth2FaCodeToken[];
}
export interface LoginOutput extends ApiResponse {
  data: {
    address: string;
    keystore: string;
    localKeyAddress: string;
    upAuthToken: string;
  };
}

export interface QueryAccountKeysetInput {
  email: string;
  upAuthToken: string;
  sessionKeyPermit: SessionKeyPermit | Record<string, never>;
}
export interface QueryAccountKeysetOutput extends ApiResponse {
  data: {
    masterKeyAddress: string;
    accountAddress: string;
    keyset: string;
  };
}

export interface PasswordTokenOutput extends ApiResponse {
  data: {
    address: string;
    pending: boolean;
    upAuthToken: string;
    showCaptcha: boolean;
  };
}

export interface KeyGenInput {
  email: string;
  upAuthToken: string;
  sessionId: string;
  tssMsg: any;
  action: string;
}

export interface KeygenData {
  userId: string;
  sessionId: string;
  msg: any;
}

export interface StartKeyGenInput {
  email: string;
  upAuthToken: string;
  action: string;
}

export interface TssOutput extends ApiResponse {
  data: {
    upAuthToken: string;
    tssRes: KeygenData;
    msg: any;
  };
}

export interface FinishKeygenInput {
  email: string;
  upAuthToken: string;
  sessionId: string;
  userId: string;
  localKeyAddress: string;
  action: string;
}

export type StepType = "register" | "recovery";

export interface User {
  email: string;
  account: string;
  keyset: {
    hash: string;
    masterKeyAddress: string;
    keysetJson: string;
  };
  sessionKey: {
    localKey: {
      keystore: string;
      address: string;
    };
    aesKey: CryptoKey;
    authorization: string;
    expires: number;
  };
  committed: boolean;
  step?: StepType;
  stepData?: any;
}

// export interface Transaction {
//   callType: CallType;
//   revertOnError: boolean;
//   gasLimit: BigNumber;
//   target: BytesLike;
//   value: BigNumber;
//   data: BytesLike;
// }