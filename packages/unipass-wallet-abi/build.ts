import * as fs from "fs";

const erc20 = JSON.parse(
  fs
    .readFileSync(
      `${__dirname}/../../artifacts/@openzeppelin/contracts/token/ERC20/IERC20.sol/IERC20.json`
    )
    .toString("utf-8")
);

fs.writeFileSync(
  "./src/abis/erc20.json",
  JSON.stringify({ abi: erc20.abi }, null, 2)
);

const factory = JSON.parse(
  fs
    .readFileSync(
      `${__dirname}/../../artifacts/unipass-wallet-contracts/contracts/Factory.sol/Factory.json`
    )
    .toString("utf-8")
);

fs.writeFileSync(
  "./src/abis/factory.json",
  JSON.stringify({ abi: factory.abi }, null, 2)
);

const moduleMain = JSON.parse(
  fs
    .readFileSync(
      `${__dirname}/../../artifacts/unipass-wallet-contracts/contracts/modules/moduleMain.sol/moduleMain.json`
    )
    .toString("utf-8")
);

fs.writeFileSync(
  "./src/abis/moduleMain.json",
  JSON.stringify({ abi: moduleMain.abi }, null, 2)
);
