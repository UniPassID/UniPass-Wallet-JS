import { UserOperationStruct } from "@account-abstraction/contracts";
import { KeyERC1271, KeySecp256k1, KeySecp256k1Wallet, Keyset } from "@unipasswallet/keys";
import { Transaction } from "@unipasswallet/transactions";
import {
  AddHookTransactionBuilder,
  CallTxBuilder,
  RemoveHookTransactionBuilder,
} from "@unipasswallet/transaction-builders";
import { ModuleHookEIP4337WalletInterface, ModuleMainInterface } from "@unipasswallet/utils";
import { Contract, constants, providers, utils } from "ethers";

export function toJSON(op: Partial<UserOperationStruct>): Promise<any> {
  return utils.resolveProperties(op).then((userOp) =>
    Object.keys(userOp)
      .map((key) => {
        let val = (userOp as any)[key];
        if (typeof val !== "string" || !val.startsWith("0x")) {
          val = utils.hexValue(val);
        }
        return [key, val];
      })
      .reduce(
        (set, [k, v]) => ({
          ...set,
          [k]: v,
        }),
        {},
      ),
  );
}

export function getSigSize(keyset: Keyset, indexes: number[]): number {
  return keyset.keys
    .map((key, i) => {
      if (indexes.includes(i)) {
        if (KeySecp256k1.isKeySecp256k1(key) || KeySecp256k1Wallet.isKeySecp256k1Wallet(key)) {
          return 80;
        } else if (KeyERC1271.isKeyERC1271(key)) {
          return 154;
        } else {
          throw new Error(`Not Support Key: ${key}`);
        }
      } else {
        return key.generateKey().length;
      }
    })
    .reduce((sum, v) => sum + v, 1);
}

export async function isAddEIP4337Hook(
  userAddr: string,
  provider: providers.JsonRpcProvider,
  implement: string,
): Promise<boolean> {
  const unipassWalletContract = new Contract(userAddr, ModuleMainInterface, provider);
  return !(
    await Promise.all(
      [
        ModuleHookEIP4337WalletInterface.getSighash("getEIP4337WalletNonce"),
        ModuleHookEIP4337WalletInterface.getSighash("updateEntryPoint"),
        ModuleHookEIP4337WalletInterface.getSighash("execFromEntryPoint"),
        ModuleHookEIP4337WalletInterface.getSighash("validateUserOp"),
      ].map(async (selector) => {
        const addr = await unipassWalletContract.readHook(selector);
        return addr === implement;
      }),
    )
  ).some((isAddHook) => {
    return !isAddHook;
  });
}

export async function getAddEIP4337HookTransaction(
  userAddr: string,
  provider: providers.JsonRpcProvider,
  implementation: string,
): Promise<Transaction | undefined> {
  const unipassWalletContract = new Contract(userAddr, ModuleMainInterface, provider);
  const txs = (
    await Promise.all(
      [
        ModuleHookEIP4337WalletInterface.getSighash("getEIP4337WalletNonce"),
        ModuleHookEIP4337WalletInterface.getSighash("updateEntryPoint"),
        ModuleHookEIP4337WalletInterface.getSighash("execFromEntryPoint"),
        ModuleHookEIP4337WalletInterface.getSighash("validateUserOp"),
      ].map(async (selector) => {
        const addr = await unipassWalletContract.readHook(selector);
        const txs = [];
        if (addr !== implementation) {
          if (addr !== constants.AddressZero) {
            const tx = new RemoveHookTransactionBuilder(
              true,
              constants.Zero,
              userAddr,
              selector,
              constants.Zero,
            ).build();
            txs.push(tx);
          }
          const tx = new AddHookTransactionBuilder(
            true,
            constants.Zero,
            userAddr,
            selector,
            implementation,
            constants.Zero,
          ).build();
          txs.push(tx);
        }
        return txs;
      }),
    )
  ).reduce((txs, v) => {
    v.forEach((v) => txs.push(v));
    return txs;
  }, []);

  if (txs.length === 0) {
    return undefined;
  }
  return new CallTxBuilder(
    true,
    constants.Zero,
    userAddr,
    constants.Zero,
    ModuleMainInterface.encodeFunctionData("selfExecute", [100, 0, 0, txs]),
  ).build();
}
