/* eslint-disable import/no-extraneous-dependencies */
import "hardhat-dependency-compiler";
import { task } from "hardhat/config";
import * as fs from "fs";

task("compile", "Pre Compile Script", async (taskArgs, hre, runSuper) => {
  const networkName = hre.network.name;
  fs.writeFileSync(
    "./node_modules/unipass-wallet-contracts/contracts/modules/utils/LibTimeLock.sol",
    `// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

library LibTimeLock {
    //                       INIT_LOCK_DURING = 48 hours
    uint32 internal constant INIT_LOCK_DURING = 172800;
}
`,
  );
  await runSuper();
});

module.exports = {
  solidity: {
    version: "0.8.15",
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
      "unipass-wallet-contracts/contracts/OpenID.sol",
    ],
  },
};
