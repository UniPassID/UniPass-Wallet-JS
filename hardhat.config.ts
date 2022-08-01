/* eslint-disable import/no-extraneous-dependencies */
import "hardhat-dependency-compiler";

module.exports = {
  solidity: {
    version: "0.8.7",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    hardhat: {
      chainId: 31338,
    },
  },

  dependencyCompiler: {
    paths: [
      "unipass-wallet-contracts/contracts/modules/ModuleMain.sol",
      "unipass-wallet-contracts/contracts/modules/ModuleMainUpgradable.sol",
      "unipass-wallet-contracts/contracts/DkimKeys.sol",
    ],
  },
};
