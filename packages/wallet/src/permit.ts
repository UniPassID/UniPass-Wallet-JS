import { utils } from "ethers";
import { subDigest } from "@unipasswallet/utils";
import { Wallet } from "./wallet";

export interface IPermit {
  readonly timestamp: number;
  readonly weight: number;
  readonly permit: string;
}

export async function generatePermit(
  wallet: Wallet,
  sessionKeyAddr: string,
  timestamp: number,
  weight: number,
  signerIndexes: number[],
): Promise<IPermit> {
  const permitDigestHash = digestPermitMessage(wallet.address, sessionKeyAddr, timestamp, weight);
  const permit = await wallet.signPermit(permitDigestHash, signerIndexes);
  return {
    timestamp,
    weight,
    permit,
  };
}

export function digestPermitMessage(
  walletAddr: string,
  sessionKeyAddr: string,
  timestamp: number,
  weight: number,
): string {
  return subDigest(
    0,
    walletAddr,
    utils.keccak256(utils.solidityPack(["address", "uint32", "uint32"], [sessionKeyAddr, timestamp, weight])),
  );
}
