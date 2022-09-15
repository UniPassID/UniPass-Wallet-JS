import { Contract, providers } from "ethers";
import {
  BytesLike,
  Deferrable,
  getCreate2Address,
  Interface,
  keccak256,
  resolveProperties,
  solidityPack,
  toUtf8Bytes,
} from "ethers/lib/utils";
import { CreationCode, SingletonFactoryAddress } from "./constants";
import { moduleMain } from "@unipasswallet/abi";

export function subDigest(
  chainId: number,
  address: BytesLike,
  hash: BytesLike
): string {
  return keccak256(
    solidityPack(
      ["bytes", "uint256", "address", "bytes32"],
      [toUtf8Bytes("\x19\x01"), chainId, address, hash]
    )
  );
}

export function getWalletCode(moduleMainAddr: BytesLike): string {
  return solidityPack(["bytes", "uint256"], [CreationCode, moduleMainAddr]);
}

export function getWalletAddress(
  moduleMainAddr: BytesLike,
  keysetHash: BytesLike
): string {
  const code = getWalletCode(moduleMainAddr);

  return getCreate2Address(
    SingletonFactoryAddress,
    keysetHash,
    keccak256(code)
  );
}

export function getAddressDeployedBySingletonFactory(
  salt: BytesLike,
  initCodeHash: BytesLike
): string {
  return getCreate2Address(SingletonFactoryAddress, salt, initCodeHash);
}

export async function isContractDeployed(
  addr: string,
  provider: providers.Provider
): Promise<boolean> {
  return (await provider.getCode(addr)) !== "0x";
}

export async function resolveArrayProperties<T>(
  object: Readonly<Deferrable<T>> | Readonly<Deferrable<T>>[]
): Promise<T> {
  if (Array.isArray(object)) {
    // T must include array type
    return Promise.all(object.map((o) => resolveProperties(o))) as any;
  }

  return resolveProperties(object);
}

export async function getByTransactionData(
  walletAddr: string,
  data: string,
  provider: providers.Provider
): Promise<[number, number, number]> {
  const contractInterface = new Interface(moduleMain.abi);
  const sigHash = contractInterface.getSighash(data);

  if (sigHash === contractInterface.getSighash("_selfExecute")) {
    const roleWeight = contractInterface.decodeFunctionData(
      "_selfExecute",
      data
    );

    return [
      roleWeight.ownerWeight,
      roleWeight.assetsOpWeight,
      roleWeight.guardianWeight,
    ];
  }

  const wallet = new Contract(walletAddr, contractInterface, provider);
  const roleWeight = await wallet.getRoleOfPermission(sigHash);

  return roleWeight.map((v) => v.toNumber());
}
