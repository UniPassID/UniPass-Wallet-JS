import { ModuleMainGasEstimatorCode } from "./moduleMainGasEstimatorCode";
import { ModuleMainUpgradableGasEstimatorCode } from "./moduleMainUpgradableGasEstimatorCode";
export interface UnipassWalletContext {
  moduleMain: string;
  moduleMainUpgradable: string;
  moduleGuest?: string;

  dkimKeys?: string;
  openID?: string;
  moduleWhiteList?: string;

  gasEstimator?: string;
  gasEstimatingDkimKeys?: string;
  moduleMainGasEstimatorCode?: string;
  moduleMainUpgradableGasEstimatorCode?: string;
}

export const unipassWalletContext: UnipassWalletContext = {
  moduleMain: "0x62A2c503353BBc4861DF32e90734105aE1e96633",
  moduleMainUpgradable: "0x03A93f37A9c8b382E043D0Bde2730606d3eF5Ed1",
  moduleGuest: "0x176C1CD760768E3aaD920A42d3f68E91428A86Ed",

  dkimKeys: "0x9B83C19CdE636b9c8dFcB40326D28626b0766D35",
  openID: "0xaFc5526be0F5CcF5Da4B4d54A31f1d761Fe62C7f",
  moduleWhiteList: "0x28101Ce1aDFf9a017C818e9d522992bE6D490048",

  gasEstimator: "0x9E14b7098B2BBE2D24D665Fc4E8f5E7B6612d44D",
  moduleMainGasEstimatorCode: ModuleMainGasEstimatorCode,
  moduleMainUpgradableGasEstimatorCode: ModuleMainUpgradableGasEstimatorCode,
};
