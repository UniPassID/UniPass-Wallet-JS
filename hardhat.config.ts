/* eslint-disable import/no-extraneous-dependencies */
import "hardhat-dependency-compiler";

module.exports = {
  solidity: {
    version: "0.8.16",
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
      "unipass-wallet-contracts/contracts/modules/ModuleGuest.sol",
      "unipass-wallet-contracts/contracts/modules/ModuleMain.sol",
      "unipass-wallet-contracts/contracts/modules/ModuleMainUpgradable.sol",
      "unipass-wallet-contracts/contracts/modules/ModuleMainGasEstimator.sol",
      "unipass-wallet-contracts/contracts/modules/commons/ModuleWhiteList.sol",
      "unipass-wallet-contracts/contracts/modules/utils/GasEstimator.sol",
      "unipass-wallet-contracts/contracts/modules/utils/FeeEstimator.sol",
      "unipass-wallet-contracts/contracts/DkimKeys.sol",
    ],
  },
};
