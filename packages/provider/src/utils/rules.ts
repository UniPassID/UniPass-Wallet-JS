import { EMAIL_REG } from "../constant";
import WalletError from "../constant/error_map";

export const checkEmailFormat = (email: string, mailServices?: Array<string>) => {
  if (!email) throw new WalletError(40001);
  if (!EMAIL_REG.test(email)) throw new WalletError(40002);
  if (mailServices) {
    if (mailServices.length === 0) throw new WalletError(40003);
    let ok = false;
    mailServices.forEach((mail) => {
      if (email.endsWith(`@${mail}`)) {
        ok = true;
      }
    });
    if (!ok) {
      throw new WalletError(40004);
    }
  }
};

export const formatPassword = (password: string) => {
  const re = /[^A-z\d!"#$%&\\'()*+,-./:;<=>?@[\]^_`{|}~]/g;
  return password.replace(re, "");
};

export const checkPassword = (v: string) => {
  const password = v;
  if (!password) throw new WalletError(40101);
  if (/^\S{8,32}$/.test(password) === false) throw new WalletError(40102);
  if (/(?=.*[A-Z])(?=.*\S)[^]/.test(password) === false) throw new WalletError(40102);
  if (/(?=[a-z])[^]/.test(password) === false) throw new WalletError(40103);
  if (/(?=[\d]+)/.test(password) === false) throw new WalletError(40104);
};
