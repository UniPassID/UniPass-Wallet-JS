import fs from "fs";

const moduleMainGasEstimatorCode = fs.readFileSync(
  `${__dirname}/../../node_modules/unipass-wallet-contracts/networks/moduleMainGasEstimatorCode`,
);
fs.writeFileSync(
  `${__dirname}/src/moduleMainGasEstimatorCode.ts`,
  `export const ModuleMainGasEstimatorCode = "${moduleMainGasEstimatorCode}"`,
);

const moduleMainUpgradableGasEstimatorCode = fs.readFileSync(
  `${__dirname}/../../node_modules/unipass-wallet-contracts/networks/moduleMainUpgradableGasEstimatorCode`,
);
fs.writeFileSync(
  `${__dirname}/src/moduleMainUpgradableGasEstimatorCode.ts`,
  `export const ModuleMainUpgradableGasEstimatorCode = "${moduleMainUpgradableGasEstimatorCode}"`,
);
