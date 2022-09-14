import { useEffect, useState } from "react";
import { message } from "antd";
import UnipassWalletProvider from "@unipasswallet/provider";

export function useUnipass() {
  const [unipassWallet, setUnipassWallet] = useState<UnipassWalletProvider | undefined>(undefined);
  const [error, setError] = useState<any>(undefined);

  useEffect(() => {
    try {
      const wallet = UnipassWalletProvider.getInstance({ chainName: "polygon", env: "dev" });
      setUnipassWallet(wallet);
    } catch (e: any) {
      message.error(e?.message);
    }
  }, []);

  const sendCode = async (email: string) => {
    try {
      if (unipassWallet) {
        await unipassWallet.sendCode(email);
        return true;
      }
    } catch (e: any) {
      message.error(e?.message);
    }
  };

  const verifyCode = async (code: string) => {
    try {
      if (unipassWallet) {
        await unipassWallet.verifyCode(code);
        return true;
      }
    } catch (e: any) {
      message.error(e?.message);
    }
  };

  const register = async (password: string) => {
    try {
      if (unipassWallet) {
        await unipassWallet.register(password);
        return true;
      }
    } catch (e: any) {
      message.error(e?.message);
    }
  };

  const passwordToken = async (email: string, password: string) => {
    try {
      if (unipassWallet) {
        await unipassWallet.passwordToken(email, password);
        return true;
      }
    } catch (e: any) {
      message.error(e?.message);
    }
  };

  const login = async (code: string) => {
    try {
      if (unipassWallet) {
        await unipassWallet.login(code);
        return true;
      }
    } catch (e: any) {
      message.error(e?.message);
    }
  };

  return { unipassWallet, sendCode, verifyCode, register, passwordToken, login, error };
}
