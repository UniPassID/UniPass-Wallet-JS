import { Interface } from "ethers/lib/utils";
import { dkimKeys, moduleMain, moduleWhiteList, openID } from "@unipasswallet/abi";

export const CreationCode: string =
  "0x603a600e3d39601a805130553df3363d3d373d3d3d363d30545af43d82803e903d91601857fd5bf3";

export const SingletonFactoryAddress = "0xce0042b868300000d44a59004da54a005ffdcf9f";

export const SingletonFactoryInterface = new Interface(`[
  {
      "constant": false,
      "inputs": [
          {
              "internalType": "bytes",
              "name": "_initCode",
              "type": "bytes"
          },
          {
              "internalType": "bytes32",
              "name": "_salt",
              "type": "bytes32"
          }
      ],
      "name": "deploy",
      "outputs": [
          {
              "internalType": "address payable",
              "name": "createdContract",
              "type": "address"
          }
      ],
      "payable": false,
      "stateMutability": "nonpayable",
      "type": "function"
  }
]`);

export const ModuleMainInterface = new Interface(moduleMain.abi);

export const DkimKeyInterface = new Interface(dkimKeys.abi);

export const ModuleWhiteListInterface = new Interface(moduleWhiteList.abi);

export const OpenIDInterface = new Interface(openID.abi);
