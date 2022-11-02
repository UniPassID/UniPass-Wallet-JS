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
  moduleMain: "0x0B9B8631501DF5Fc9D7444CEb88080eCb77b4fBb",
  moduleMainUpgradable: "0xACb3b9f3BfE579b0DB0372a317AB4243189695fa",
  moduleGuest: "0xA9dC809f017320362cAa0f973c4eB34234FefB77",

  dkimKeys: "0xffEF85eb9b6FDd5462E7255FA4ab6E09Dc98e2aE",
  openID:"0x0E12aDcD52376614A14653f389801B7E25887aE5",
  moduleWhiteList: "0x40F589896987eF460CaD5f37460d717d2Bf6d3FE",

  gasEstimator: "0x6041ae26F00BCec8c04a27190cB75f400a6582d3",
  moduleMainGasEstimatorCode: ModuleMainGasEstimatorCode,
  moduleMainUpgradableGasEstimatorCode: ModuleMainUpgradableGasEstimatorCode,
};
