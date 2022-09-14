import { useEffect, useState } from "react";
import { message } from "antd";
import UnipassWalletProvider from "@unipasswallet/provider";

export function useUnipass() {
  const [unipassWallet, setUnipassWallet] = useState<UnipassWalletProvider | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const wallet = UnipassWalletProvider.getInstance({ chainName: "polygon", env: "dev" });
      setUnipassWallet(wallet);
    } catch (e: any) {
      message.error(e.message);
    }
  }, []);

  const registerCode = async (email: string) => {
    try {
      if (unipassWallet) {
        setLoading(true);
        await unipassWallet.registerCode(email);
        return true;
      }
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const loginCode = async (email: string) => {
    try {
      if (unipassWallet) {
        setLoading(true);
        await unipassWallet.loginCode(email);
        return true;
      }
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyRegisterCode = async (code: string) => {
    try {
      if (unipassWallet) {
        setLoading(true);
        await unipassWallet.verifyRegisterCode(code);
        return true;
      }
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const register = async (password: string) => {
    try {
      if (unipassWallet) {
        setLoading(true);
        await unipassWallet.register(password);
        return true;
      }
    } catch (e: any) {
      message.error(e.message);
    }
  };

  const passwordToken = async (email: string, password: string) => {
    try {
      if (unipassWallet) {
        setLoading(true);
        await unipassWallet.passwordToken(email, password);
        return true;
      }
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const login = async (code: string) => {
    try {
      if (unipassWallet) {
        setLoading(true);
        await unipassWallet.login(code);
        return true;
      }
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (unipassWallet) {
        setLoading(true);
        await unipassWallet.logout();
        return true;
      }
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return { unipassWallet, registerCode, loginCode, verifyRegisterCode, register, passwordToken, login, logout, loading };
}
