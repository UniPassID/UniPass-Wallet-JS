export interface UnipassWalletContext {
  moduleMain: string;
  moduleMainUpgradable: string;
  moduleGuest?: string;

  dkimKeys?: string;
  moduleWhiteList?: string;

  gasEstimator?: string;
}

export const unipassWalletContext: UnipassWalletContext = {
  moduleMain: "0xa645a878CEDF00052CE7fcC9c7250Bf993843F15",
  moduleMainUpgradable: "0x560623327F013bF4719949a40A90eF6cD05871E7",
  moduleGuest: "0xc978e3B8cb432273CF4Ff6C6c3C7590139c9F49e",

  dkimKeys: "0xe59C516F6eaE143B2563f8006D69dDC1f417bba3",
  moduleWhiteList: "0x40F589896987eF460CaD5f37460d717d2Bf6d3FE",

  gasEstimator: "0x6041ae26F00BCec8c04a27190cB75f400a6582d3",
};
