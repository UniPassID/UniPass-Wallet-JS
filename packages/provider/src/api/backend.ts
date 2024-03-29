import { SyncTransactionOutput, TssAuditInput, TssAuditOutput } from "./../interface/index";
import {
  AccountStatusInput,
  AccountStatusOutput,
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
  SyncEmailInput,
  SyncEmailOutput,
  SyncTransactionInput,
  TssOutput,
  VerifyOtpCodeInput,
  VerifyOtpCodeOutput,
} from "../interface";
import UnipassWalletProvider from "../index";
import { getUpSignToken } from "../utils/storages";

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

function accountStatus(data: AccountStatusInput) {
  return getAxiosInstance().post<any, AccountStatusOutput>("/sync/status", data);
}

function tssAudit(data: TssAuditInput) {
  const up_sign_token = getUpSignToken() || "";

  return getAxiosInstance().post<any, TssAuditOutput>("/tss/audit", data, {
    headers: { "up-sign-token": up_sign_token },
  });
}

function syncEmail(data: SyncEmailInput) {
  return getAxiosInstance().post<any, SyncEmailOutput>("/sync/send/auth.email", data);
}

function syncTransaction(data: SyncTransactionInput) {
  return getAxiosInstance().post<any, SyncTransactionOutput>("/sync/transaction", data);
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
  accountStatus,
  tssAudit,
  syncEmail,
  syncTransaction,
};
