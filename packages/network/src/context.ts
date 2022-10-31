import { ModuleMainGasEstimatorCode } from "./moduleMainGasEstimatorCode";
import { ModuleMainUpgradableGasEstimatorCode } from "./moduleMainUpgradableGasEstimatorCode";
export interface UnipassWalletContext {
  moduleMain: string;
  moduleMainUpgradable: string;
  moduleGuest?: string;

  dkimKeys?: string;
  moduleWhiteList?: string;

  gasEstimator?: string;
  gasEstimatingDkimKeys?: string;
  moduleMainGasEstimatorCode?: string;
  moduleMainUpgradableGasEstimatorCode?: string;
}

export const unipassWalletContext: UnipassWalletContext = {
  moduleMain: "0x1039762670Eff9BC787a6a3Ec7c5b2dd1bB2c13b",
  moduleMainUpgradable: "0x11cd36987DD3e27A93AF1e349d7bB1815C939c1e",
  moduleGuest: "0xc978e3B8cb432273CF4Ff6C6c3C7590139c9F49e",

  dkimKeys: "0xe59C516F6eaE143B2563f8006D69dDC1f417bba3",
  moduleWhiteList: "0x40F589896987eF460CaD5f37460d717d2Bf6d3FE",

  gasEstimator: "0x6041ae26F00BCec8c04a27190cB75f400a6582d3",
  moduleMainGasEstimatorCode: ModuleMainGasEstimatorCode,
  moduleMainUpgradableGasEstimatorCode: ModuleMainUpgradableGasEstimatorCode,
};
