import { Interface } from "ethers/lib/utils";
import {
  moduleMain,
  moduleMainUpgradable,
  singletonFactory,
  moduleGuest,
  moduleHookEIP4337Wallet,
  multiCall,
} from "@unipasswallet/abi";

export const CreationCode: string =
  "0x603a600e3d39601a805130553df3363d3d373d3d3d363d30545af43d82803e903d91601857fd5bf3";

export const SingletonFactoryAddress = "0xce0042b868300000d44a59004da54a005ffdcf9f";

export const SingletonFactoryInterface = new Interface(singletonFactory.abi);

export const ModuleMainInterface = new Interface(moduleMain.abi);

export const ModuleMainUpgradableInterface = new Interface(moduleMainUpgradable.abi);

export const ModuleGuestInterface = new Interface(moduleGuest.abi);

export const ModuleHookEIP4337WalletInterface = new Interface(moduleHookEIP4337Wallet.abi);

export const MultiCallInterface = new Interface(multiCall.abi);

export const MultiCallAddress = "0x175d02d277eac0838af14D09bf59f11B365BAB42";
