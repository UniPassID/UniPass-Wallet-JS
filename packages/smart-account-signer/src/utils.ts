import Web3Auth from "@web3auth/single-factor-auth";
import { base64, hexlify, toUtf8String } from "ethers/lib/utils";
import { UnipassRunningEnv } from "./interface";
import { SmartAccountError, SmartAccountErrorCode } from "@unipasswallet/smart-account";

export function getUnipassServerInfo(runningEnv: UnipassRunningEnv): {
  unipassServerUrl: string;
  chainId: number;
  env: "testnet" | "mainnet";
  rpcUrl: string;
} {
  switch (runningEnv) {
    case UnipassRunningEnv.Dev:
      return {
        unipassServerUrl: "https://d.wallet.unipass.vip/wallet-v2",
        chainId: 5,
        env: "testnet",
        rpcUrl: "https://node.wallet.unipass.id/eth-goerli",
      };
    case UnipassRunningEnv.Testnet:
      return {
        unipassServerUrl: "https://t.wallet.unipass.vip/wallet-v2",
        chainId: 5,
        env: "testnet",
        rpcUrl: "https://node.wallet.unipass.id/eth-goerli",
      };
    default:
      throw new Error(`Unknown Env: ${runningEnv}`);
  }
}

export async function getWeb3AuthPrivateKey(
  clientId: string,
  idToken: string,
  verifier: string,
  subKey: string,
  chainId: number,
  web3AuthNetwork: "testnet" | "mainnet",
  rpcUrl: string,
): Promise<string | undefined> {
  const web3Auth = new Web3Auth({
    clientId,
    chainConfig: { chainNamespace: "eip155", chainId: hexlify(chainId), rpcTarget: rpcUrl },
    web3AuthNetwork,
  });
  web3Auth.init();
  const verifierId = getIdTokenSub(idToken, subKey);
  if (!verifierId) {
    const error = {
      code: SmartAccountErrorCode.InvalidIdToken,
      data: undefined,
      message: "Invalid Id Token",
    } as SmartAccountError<undefined>;

    throw error;
  }
  const provider = await web3Auth.connect({ verifier, idToken, verifierId });
  if (provider) {
    const privateKey = await provider.request<string>({ method: "eth_private_key" });
    if (privateKey) {
      return privateKey;
    }
  }
  return undefined;
}

export function getIdTokenSub(idToken: string, subKey: string): string | undefined {
  const payload = idToken.split(".")[1];
  if (payload) {
    const decodedPayload = JSON.parse(toUtf8String(base64.decode(payload)));
    return decodedPayload[subKey];
  }
  return undefined;
}
