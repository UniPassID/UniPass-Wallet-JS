import {
  ApiResponse,
  FinishKeygenInput,
  GetPasswordTokenInput,
  KeyGenInput,
  LoginInput,
  LoginOutput,
  PasswordTokenOutput,
  QueryAccountKeysetInput,
  QueryAccountKeysetOutput,
  SendOtpCodeInput,
  SignInput,
  SignUpAccountInput,
  SignUpAccountOutput,
  StartKeyGenInput,
  StartSignInput,
  SuffixesOutput,
  TssOutput,
  VerifyOtpCodeInput,
  VerifyOtpCodeOutput,
} from "../interface";
import UnipassWalletProvider from "../index";

function getAxiosInstance() {
  return UnipassWalletProvider.request;
}

function getSuffixes() {
  return getAxiosInstance().get<any, SuffixesOutput>("/config");
}

function sendOtpCode(data: SendOtpCodeInput) {
  return getAxiosInstance().post<any, ApiResponse>("/otp/send", data);
}

function verifyOtpCode(data: VerifyOtpCodeInput) {
  return getAxiosInstance().post<any, VerifyOtpCodeOutput>("/otp/verify", data);
}

function startSign(data: StartSignInput) {
  return getAxiosInstance().post<any, TssOutput>("/tss/sign/start", data);
}

function sign(data: SignInput) {
  return getAxiosInstance().post<any, TssOutput>("/tss/sign", data);
}

function signUpAccount(data: SignUpAccountInput) {
  return getAxiosInstance().post<any, SignUpAccountOutput>("/account/signup", data);
}

function getPasswordToken(data: GetPasswordTokenInput) {
  return getAxiosInstance().post<any, PasswordTokenOutput>("/account/password.token", data);
}

function queryAccountKeyset(data: QueryAccountKeysetInput) {
  return getAxiosInstance().post<any, QueryAccountKeysetOutput>("/account/keyset", data);
}

function loign(data: LoginInput) {
  return getAxiosInstance().post<any, LoginOutput>("/account/signIn", data);
}

function getKeygen(data: KeyGenInput) {
  return getAxiosInstance().post<any, TssOutput>("/tss/keygen", data);
}

function startKeygen(data: StartKeyGenInput) {
  return getAxiosInstance().post<any, TssOutput>("/tss/keygen/start", data);
}

function finishKeygen(data: FinishKeygenInput) {
  return getAxiosInstance().post<any, TssOutput>("/tss/keygen/finish", data);
}

export default {
  getSuffixes,
  sendOtpCode,
  verifyOtpCode,
  startSign,
  sign,
  signUpAccount,
  getPasswordToken,
  queryAccountKeyset,
  loign,
  getKeygen,
  startKeygen,
  finishKeygen,
};
