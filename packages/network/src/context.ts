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

export const MAINNET_UNIPASS_WALLET_CONTEXT: UnipassWalletContext = {
  moduleMain: "0xcFf9881905CDf1B3c3beA5644C97d0E38b186E8c",
  moduleMainUpgradable: "0xf7584d0e9b9D088E21798010449eD61eB4C80864",
  moduleGuest: "0x176C1CD760768E3aaD920A42d3f68E91428A86Ed",

  dkimKeys: "0xF073c382F29D1b45436923C1A7BB4BA21D354aD8",
  openID: "0x51f701e6FaF73cb20aA2b69EfcEa4e6f24478B75",
  moduleWhiteList: "0x93b3eDFc588EdE0a90d8bb3A59348CFCc3C4444c",

  gasEstimator: "0x9E14b7098B2BBE2D24D665Fc4E8f5E7B6612d44D",
  moduleMainGasEstimatorCode: ModuleMainGasEstimatorCode,
  moduleMainUpgradableGasEstimatorCode: ModuleMainUpgradableGasEstimatorCode,
};

export const TESTNET_UNIPASS_WALLET_CONTEXT: UnipassWalletContext = {
  moduleMain: "0xF40BDC4b39477CADd74726c2c1943fF5047Ca391",
  moduleMainUpgradable: "0x300a359B7365162263B729d77467a5016D40A4Da",
  moduleGuest: "0x176C1CD760768E3aaD920A42d3f68E91428A86Ed",

  dkimKeys: "0x9D12e851442bDf1224E061e2994AB2DcaC051fa0",
  openID: "0xaFc5526be0F5CcF5Da4B4d54A31f1d761Fe62C7f",
  moduleWhiteList: "0x28101Ce1aDFf9a017C818e9d522992bE6D490048",

  gasEstimator: "0x9E14b7098B2BBE2D24D665Fc4E8f5E7B6612d44D",
  moduleMainGasEstimatorCode: ModuleMainGasEstimatorCode,
  moduleMainUpgradableGasEstimatorCode: ModuleMainUpgradableGasEstimatorCode,
};
