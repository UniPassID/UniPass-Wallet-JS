export interface UnipassWalletContext {
  moduleMain: string;
  moduleMainUpgradable: string;
  moduleGuest?: string;

  dkimKeys?: string;
  moduleWhiteList?: string;
}

export const unipassWalletContext: UnipassWalletContext = {
  moduleMain: "0x86407827c875a69F6A2dfa00d50dd4F2Da24ac66",
  moduleMainUpgradable: "0x02997dfE857c10276Ffba7d702Cf0fb9096E3b97",
  moduleGuest: "0xCB0F96A80bdaE9B7e453C6cee0895DEc3a47cAf0",

  dkimKeys: "0xe59C516F6eaE143B2563f8006D69dDC1f417bba3",
  moduleWhiteList: "0x6b688e748AeA655EF5d950dDd62d92BD8613B88b",
};
