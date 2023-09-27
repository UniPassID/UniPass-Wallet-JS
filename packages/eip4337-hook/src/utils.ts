import { UserOperationStruct } from "@account-abstraction/contracts";
import { KeyERC1271, KeySecp256k1, KeySecp256k1Wallet, Keyset, RoleWeight } from "@unipasswallet/keys";
import { Transaction } from "@unipasswallet/transactions";
import {
  AddHookTransactionBuilder,
  AddPermissionTransactionBuilder,
  CallTxBuilder,
  RemoveHookTransactionBuilder,
} from "@unipasswallet/transaction-builders";
import {
  ModuleHookEIP4337WalletInterface,
  ModuleMainInterface,
  MultiCallAddress,
  MultiCallInterface,
} from "@unipasswallet/utils";
import { Contract, constants, providers, utils } from "ethers";
import { BaseAccountAPI } from "@account-abstraction/sdk/dist/src/BaseAccountAPI";
import { HttpRpcClient } from "@account-abstraction/sdk";
import { Fetch, buildResponse, createPostHTTPRequest } from "./verifyingPaymasterAPI";

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
        return key.generateKey().length / 2 - 1;
      }
    })
    .reduce((sum, v) => sum + v, 1);
}

async function getHooks(userAddr: string, provider: providers.Provider) {
  const multiCall = new Contract(MultiCallAddress, MultiCallInterface, provider);
  const selectors = [
    ModuleHookEIP4337WalletInterface.getSighash("getEIP4337WalletNonce"),
    ModuleHookEIP4337WalletInterface.getSighash("updateEntryPoint"),
    ModuleHookEIP4337WalletInterface.getSighash("execFromEntryPoint"),
    ModuleHookEIP4337WalletInterface.getSighash("validateUserOp"),
  ];
  const { returnData } = await multiCall.callStatic.aggregate(
    selectors.map((selector) => {
      return {
        target: userAddr,
        callData: ModuleMainInterface.encodeFunctionData("readHook", [selector]),
      };
    }),
  );
  return returnData.map((v, i) => {
    return {
      hook:
        v === "0x" ? constants.AddressZero : (utils.defaultAbiCoder.decode(["address"], v)[0] as string).toLowerCase(),
      selector: selectors[i],
    };
  });
}

export async function isAddEIP4337Hook(userAddr: string, provider: providers.Provider, impl: string): Promise<boolean> {
  const hooks = await getHooks(userAddr, provider);

  const implement = impl.toLowerCase();

  return !hooks.some(({ hook }) => {
    return hook !== implement;
  });
}

export async function needAddEIP4337Hook(input: {
  userAddr: string;
  provider: providers.Provider;
  impl: string;
  fetch: Fetch;
  paymasterUrl: string;
  chain: number;
}): Promise<boolean> {
  const { chain, userAddr, provider, impl, paymasterUrl, fetch } = input;

  const ret = await fetch(
    paymasterUrl,
    createPostHTTPRequest({
      jsonrpc: "2.0",
      id: 1,
      method: "pm_isWhiteList",
      params: [chain, userAddr],
    }),
  );
  const isWhiteList: boolean = await buildResponse(ret);

  if (!isWhiteList) {
    return false;
  }

  return !isAddEIP4337Hook(userAddr, provider, impl);
}

export async function getAddEIP4337HookTransaction(
  userAddr: string,
  provider: providers.JsonRpcProvider,
  impl: string,
): Promise<Transaction | undefined> {
  const hooks = await getHooks(userAddr, provider);
  const implementation = impl.toLowerCase();
  const txs = hooks
    .map(({ hook, selector }) => {
      const txs = [];
      if (hook !== implementation) {
        if (hook !== constants.AddressZero) {
          const tx = new RemoveHookTransactionBuilder(true, constants.Zero, userAddr, selector, constants.Zero).build();
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

        // if selector == updateEntryPoint, set permission for updateEntryPoint
        if (selector === ModuleHookEIP4337WalletInterface.getSighash("updateEntryPoint")) {
          const addPermissionTx = new AddPermissionTransactionBuilder(
            true,
            constants.Zero,
            userAddr,
            selector,
            new RoleWeight(100, 100, 0),
            constants.Zero
          ).build()
          txs.push(addPermissionTx)
        }
      }
      return txs;
    })
    .reduce((txs, v) => {
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

export async function getRemoveEIP4337HookTransaction(
  userAddr: string,
  provider: providers.JsonRpcProvider,
): Promise<Transaction | undefined> {
  const hooks = await getHooks(userAddr, provider);
  const txs = hooks
    .map(({ hook, selector }) => {
      if (hook !== constants.AddressZero) {
        const tx = new RemoveHookTransactionBuilder(true, constants.Zero, userAddr, selector, constants.Zero).build();
        return tx;
      }
      return undefined;
    })
    .reduce((txs, v) => {
      if (v) {
        txs.push(v);
      }
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

export async function simulateEIP4337HookTransaction(accountApi: BaseAccountAPI, transaction: Transaction) {
  const data = ModuleHookEIP4337WalletInterface.encodeFunctionData("execFromEntryPoint", [transaction]);
  return accountApi.createUnsignedUserOp({
    target: await accountApi.getAccountAddress(),
    data,
  });
}

export async function sendEIP4337HookTransaction(
  client: HttpRpcClient,
  accountApi: BaseAccountAPI,
  unsignedUserOp: UserOperationStruct,
): Promise<string> {
  const userOp = await accountApi.signUserOp(unsignedUserOp);
  userOp.signature = await userOp.signature;

  return client.sendUserOpToBundler(userOp);
}
