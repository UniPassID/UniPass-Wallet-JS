export interface UnipassWalletContext {
  moduleMain: string;
  moduleMainUpgradable: string;
  moduleGuest?: string;

  dkimKeys?: string;
  moduleWhiteList?: string;

  gasEstimator?: string;
}

export const unipassWalletContext: UnipassWalletContext = {
  moduleMain: "0x04c9CeF691D305f12816CAA5ee57d346e21c9334",
  moduleMainUpgradable: "0x43574355F5290D79C95f13DfE39958768E98E74c",
  moduleGuest: "0xCB0F96A80bdaE9B7e453C6cee0895DEc3a47cAf0",

  dkimKeys: "0xe59C516F6eaE143B2563f8006D69dDC1f417bba3",
  moduleWhiteList: "0x6b688e748AeA655EF5d950dDd62d92BD8613B88b",

  gasEstimator: "0x6041ae26F00BCec8c04a27190cB75f400a6582d3",
};
