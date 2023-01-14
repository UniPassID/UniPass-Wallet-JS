import { Contract, providers } from "ethers";
import {
  arrayify,
  BytesLike,
  defaultAbiCoder,
  Deferrable,
  getCreate2Address,
  hexlify,
  Interface,
  keccak256,
  resolveProperties,
  solidityPack,
  toUtf8Bytes,
} from "ethers/lib/utils";
import {
  CreationCode,
  DkimKeyInterface,
  ModuleMainInterface,
  ModuleWhiteListInterface,
  OpenIDInterface,
  SingletonFactoryAddress,
} from "./constants";
import { moduleMain } from "@unipasswallet/abi";

export function subDigest(chainId: number, address: BytesLike, hash: BytesLike): string {
  return keccak256(
    solidityPack(["bytes", "uint256", "address", "bytes32"], [toUtf8Bytes("\x19\x01"), chainId, address, hash]),
  );
}

export function getWalletCode(moduleMainAddr: BytesLike): string {
  return solidityPack(["bytes", "uint256"], [CreationCode, moduleMainAddr]);
}

export function getWalletAddress(moduleMainAddr: BytesLike, keysetHash: BytesLike): string {
  const code = getWalletCode(moduleMainAddr);

  return getCreate2Address(SingletonFactoryAddress, keysetHash, keccak256(code));
}

export function getAddressDeployedBySingletonFactory(salt: BytesLike, initCodeHash: BytesLike): string {
  return getCreate2Address(SingletonFactoryAddress, salt, initCodeHash);
}

export async function isContractDeployed(addr: string, provider: providers.Provider): Promise<boolean> {
  return (await provider.getCode(addr)) !== "0x";
}

export async function resolveArrayProperties<T>(
  object: Readonly<Deferrable<T>> | Readonly<Deferrable<T>>[],
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
  provider: providers.Provider,
): Promise<[number, number, number]> {
  const contractInterface = new Interface(moduleMain.abi);
  const sigHash = contractInterface.getSighash(data);

  if (sigHash === contractInterface.getSighash("_selfExecute")) {
    const roleWeight = contractInterface.decodeFunctionData("_selfExecute", data);

    return [roleWeight.ownerWeight, roleWeight.assetsOpWeight, roleWeight.guardianWeight];
  }

  const wallet = new Contract(walletAddr, contractInterface, provider);
  const roleWeight = await wallet.getRoleOfPermission(sigHash);

  return roleWeight.map((v) => v.toNumber());
}

export function obscureEmail(email: string): string {
  if (!email) {
    return "";
  }

  const emailData = email.split("@");
  const emailStart = emailData[0][0];
  const emailEnd = emailData[0][emailData[0].length - 1];

  if (email.includes("@")) {
    return `${emailStart}***${emailEnd}@${emailData[1]}`;
  }

  return `${emailStart}***${emailEnd}`;
}

export function decodeContractError(error: BytesLike): string | undefined {
  let ret = decodeModuleMainError(error);
  if (!ret) {
    ret = decodeDkimKeysError(error);
    if (!ret) {
      ret = decodeOpenIDError(error);
      if (!ret) {
        ret = decodeModuleWhiteListError(error);
      }
    }
  }

  if (!ret) {
    ret = hexlify(error);
  }
  return ret;
}

export function decodeModuleMainError(error: BytesLike): string | undefined {
  const ret: string | undefined = Object.entries(ModuleMainInterface.errors)
    .map(([name]) => name)
    .reduce((ret: undefined | string, name) => {
      if (ret) {
        return ret;
      }
      try {
        const decodedError = ModuleMainInterface.decodeErrorResult(name, error);
        switch (name) {
          case "ConstantPermission(bytes4)":
            return `ConstantPermission(${decodedError[0]})`;
          case "DkimFailed(bytes)": {
            const reason = decodeDkimKeysError(decodedError);
            if (reason) {
              return `DkimFailed(${reason})`;
            } else {
              return `DkimFailed(${decodedError[0]})`;
            }
          }
          case "HookAlreadyExists(bytes4)":
            return `HookAlreadyExists(${decodedError[0]})`;
          case "HookDoesNotExist(bytes4)":
            return `HookDoesNotExist(${decodedError[0]})`;
          case "ImmutableSelectorSigWeight(bytes4)":
            return `ImmutableSelectorSigWeight(${decodedError[0]})`;
          case "InvalidActionType(uint256)":
            return `InvalidActionType(${decodedError[0]})`;
          case "InvalidCallType(uint8)":
            return `InvalidCallType(${decodedError[0]})`;
          case "InvalidImplementation(address)":
            return `InvalidImplementation(${decodedError[0]})`;
          case "InvalidKeyType(uint8)":
            return `InvalidKeyType(${decodedError[0]})`;
          case "InvalidOpenIDWithEmailSig(uint8)":
            return `InvalidOpenIDWithEmailSig(${decodedError[0]})`;
          case "InvalidSValue(bytes,bytes32)":
            return `InvalidSValue(${decodedError[0]}, ${decodedError[1]})`;
          case "InvalidSignatureLength(bytes)":
            return `InvalidSignatureLength(${decodedError[0]})`;
          case "InvalidVValue(bytes,uint256)":
            return `InvalidVValue(${decodedError[0]}, ${decodedError[1]})`;
          case "IsHooksWhiteListRevert(bytes)": {
            const reason = decodeModuleWhiteListError(decodedError[0]);
            if (reason) {
              return `IsHooksWhiteListRevert(${reason})`;
            } else {
              return `IsHooksWhiteListRevert(${decodedError[0]})`;
            }
          }
          case "IsImplementationWhiteListRevert(bytes)": {
            const reason = decodeModuleWhiteListError(decodedError[0]);
            if (reason) {
              return `IsImplementationWhiteListRevert(${reason})`;
            } else {
              return `IsImplementationWhiteListRevert(${decodedError[0]})`;
            }
          }
          case "NotEnoughGas(uint256, uint256, uint256)":
            return `NotEnoughGas(${decodedError[0]}, ${decodedError[1]}, ${decodedError[2]})`;
          case "OpenIDAuthFailed(bytes)": {
            const reason = decodeOpenIDError(decodedError[0]);
            if (reason) {
              return `OpenIDAuthFailed(${reason})`;
            } else {
              return `OpenIDAuthFailed(${decodedError[0]})`;
            }
          }
          case "SelectorDoesNotExist(bytes4)":
            return `SelectorDoesNotExist(${decodedError[0]})`;
          case "SignerIsAddress0(bytes)":
            return `SignerIsAddress0(${decodedError[0]})`;
          case "TxFailed(bytes32,uint256,bytes)":
            return `TxFailed(${decodedError[0]}, ${decodedError[1]}, ${decodeContractError(decodedError[2])})`;
          case "UnknownCallDataSelector(bytes4)":
            return `UnknownCallDataSelector(${decodedError[0]})`;
          case "UnsupportedSignatureType(bytes,uint256,bool)":
            return `UnsupportedSignatureType(${decodedError[0]}, ${decodedError[1]}, ${decodedError[2]})`;
          default:
            throw new Error(`Unknown Error: ${name}: ${decodedError}`);
        }
      } catch (error) {
        return ret;
      }
    }, undefined);

  if (!ret) {
    return decodeBuiltinError(error);
  }

  return ret;
}

export function decodeOpenIDError(error: BytesLike): string | undefined {
  const ret = Object.entries(OpenIDInterface.errors)
    .map(([name]) => name)
    .reduce((ret: undefined | string, [name]: any) => {
      if (ret) {
        return ret;
      }
      try {
        const decodedError = OpenIDInterface.decodeErrorResult(name, error);
        switch (name) {
          case "ReadBytes32OutOfBounds(bytes,uint256)":
            return `ReadBytes32OutOfBounds(${decodedError[0]}, ${decodedError[1]})`;
          default:
            return ret;
        }
      } catch (error) {
        return ret;
      }
    }, undefined);

  if (!ret) {
    return decodeBuiltinError(error);
  }

  return ret;
}

export function decodeBuiltinError(error: BytesLike): string | undefined {
  const bytes = arrayify(error);
  if (hexlify(bytes.slice(0, 4)) === "0x08c379a0") {
    const ret = defaultAbiCoder.decode(["string"], bytes.slice(4));
    return `Error(${ret[0]})`;
  }
  return undefined;
}

export function decodeModuleWhiteListError(error: BytesLike): string | undefined {
  const ret = Object.entries(ModuleWhiteListInterface.errors)
    .map(([name]) => name)
    .reduce((ret, name) => {
      if (ret) {
        return ret;
      }
      try {
        const decodedError = ModuleWhiteListInterface.decodeErrorResult(name, error);
        switch (name) {
          case "InvalidStatus(bool,bool)":
            return `InvalidStatus(${decodedError[0]})`;
          default:
            return ret;
        }
      } catch (error) {
        return ret;
      }
    }, undefined);

  if (!ret) {
    return decodeBuiltinError(error);
  }

  return ret;
}

export function decodeDkimKeysError(error: BytesLike): string | undefined {
  const ret = Object.entries(DkimKeyInterface.errors)
    .map(([name]) => name)
    .reduce((ret, [name]) => {
      if (ret) {
        return ret;
      }
      try {
        const decodedError = DkimKeyInterface.decodeErrorResult(name, error);
        switch (name) {
          case "GetEmailHashByZKRevert(bytes)":
            return `GetEmailHashByZKRevert(${decodedError[0]})`;
          case "InvalidEmailVerifyType(uint8)":
            return `InvalidEmailVerifyType(${decodedError[0]})`;
          case "InvalidEmailType(uint8)":
            return `InvalidEmailType(${decodedError[0]})`;
          case "InvalidEncodings(bytes1)":
            return `InvalidEncodings(${decodedError[0]})`;
          case "ReadBytes32OutOfBounds(bytes,uint256)":
            return `ReadBytes32OutOfBounds(${decodedError[0]}, ${decodedError[1]})`;
          default:
            return ret;
        }
      } catch (error) {
        return ret;
      }
    }, undefined);

  if (!ret) {
    return decodeBuiltinError(error);
  }

  return ret;
}
