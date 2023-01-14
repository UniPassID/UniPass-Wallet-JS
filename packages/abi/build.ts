import * as fs from "fs";

const erc20 = JSON.parse(
  fs
    .readFileSync(`${__dirname}/../../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json`)
    .toString("utf-8"),
);

fs.writeFileSync("./src/abis/erc20.json", JSON.stringify({ abi: erc20.abi }, null, 2));

const moduleMainUpgradable = JSON.parse(
  fs
    .readFileSync(
      `${__dirname}/../../artifacts/unipass-wallet-contracts/contracts/modules/ModuleMainUpgradable.sol/ModuleMainUpgradable.json`,
    )
    .toString("utf-8"),
);

const moduleMainGasEstimator = JSON.parse(
  fs
    .readFileSync(
      `${__dirname}/../../artifacts/unipass-wallet-contracts/contracts/modules/ModuleMainGasEstimator.sol/ModuleMainGasEstimator.json`,
    )
    .toString("utf-8"),
);

const gasEstimator = JSON.parse(
  fs
    .readFileSync(
      `${__dirname}/../../artifacts/unipass-wallet-contracts/contracts/modules/utils/GasEstimator.sol/GasEstimator.json`,
    )
    .toString("utf-8"),
);

fs.writeFileSync("./src/abis/moduleMainUpgradable.json", JSON.stringify({ abi: moduleMainUpgradable.abi }, null, 2));

const moduleMain = JSON.parse(
  fs
    .readFileSync(
      `${__dirname}/../../artifacts/unipass-wallet-contracts/contracts/modules/ModuleMain.sol/ModuleMain.json`,
    )
    .toString("utf-8"),
);

fs.writeFileSync("./src/abis/moduleMain.json", JSON.stringify({ abi: moduleMain.abi }, null, 2));

const dkimKeys = JSON.parse(
  fs
    .readFileSync(`${__dirname}/../../artifacts/unipass-wallet-contracts/contracts/DkimKeys.sol/DkimKeys.json`)
    .toString("utf-8"),
);

fs.writeFileSync("./src/abis/dkimKeys.json", JSON.stringify({ abi: dkimKeys.abi }, null, 2));

fs.writeFileSync(
  "./src/abis/moduleMainGasEstimator.json",
  JSON.stringify(
    {
      abi: moduleMainGasEstimator.abi,
    },
    null,
    2,
  ),
);

fs.writeFileSync(
  "./src/abis/gasEstimator.json",
  JSON.stringify(
    {
      abi: gasEstimator.abi,
    },
    null,
    2,
  ),
);

const moduleWhiteList = JSON.parse(
  fs
    .readFileSync(
      `${__dirname}/../../artifacts/unipass-wallet-contracts/contracts/modules/commons/ModuleWhiteList.sol/ModuleWhiteList.json`,
    )
    .toString("utf-8"),
);

fs.writeFileSync("./src/abis/moduleWhiteList.json", JSON.stringify({ abi: moduleWhiteList.abi }, null, 2));

const openID = JSON.parse(
  fs
    .readFileSync(`${__dirname}/../../artifacts/unipass-wallet-contracts/contracts/OpenID.sol/OpenID.json`)
    .toString("utf-8"),
);

fs.writeFileSync("./src/abis/openID.json", JSON.stringify({ abi: openID.abi }, null, 2));
