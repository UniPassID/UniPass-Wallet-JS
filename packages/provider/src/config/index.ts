import { Environment } from "../interface/unipassWalletProvider";

export const chain_config = {
  "polygon-mainnet": {
    rpc_url: "https://node.wallet.unipass.id/polygon-mainnet",
  },
  "bsc-mainnet": {
    rpc_url: "https://node.wallet.unipass.id/bsc-mainnet",
  },
  "rangers-mainnet": {
    rpc_url: "https://node.wallet.unipass.id/rangers-mainnet",
  },
  "polygon-mumbai": {
    rpc_url: "https://node.wallet.unipass.id/polygon-mumbai",
  },
  "bsc-testnet": {
    rpc_url: "https://node.wallet.unipass.id/bsc-testnet",
  },
  "rangers-robin": {
    rpc_url: "https://node.wallet.unipass.id/rangers-robin",
  },
};

export const api_config = {
  backend: "https://poc-api.wallet.unipass.id",
  relayer: {
    polygon: "https://poc-api.wallet.unipass.id/relayer",
    bsc: "https://poc-api.wallet.unipass.id/relayer",
    rangers: "https://poc-api.wallet.unipass.id/relayer",
  },
};

export const dev_api_config = {
  backend: "https://d.wallet.unipass.vip/wallet",
  relayer: {
    polygon: "https://d.wallet.unipass.id/relayer-polygon",
    bsc: "https://d.wallet.unipass.id/relayer-bsc",
    rangers: "https://d.wallet.unipass.id/relayer-rangers",
  },
};

export const test_api_config = {
  backend: "https://t.wallet.unipass.vip/wallet",
  relayer: {
    polygon: "https://t.wallet.unipass.id/relayer-polygon",
    bsc: "https://t.wallet.unipass.id/relayer-bsc",
    rangers: "https://t.wallet.unipass.id/relayer-rangers",
  },
};

export const testnet_api_config = {
  backend: "https://testnet.wallet.unipass.id/wallet",
  relayer: {
    polygon: "https://testnet.wallet.unipass.id/relayer-polygon",
    bsc: "https://testnet.wallet.unipass.id/relayer-bsc",
    rangers: "https://testnet.wallet.unipass.id/relayer-rangers",
  },
};

export const getApiConfig = (env: Environment) => {
  switch (env) {
    case "dev":
      return dev_api_config;
    case "test":
      return test_api_config;
    case "testnet":
      return testnet_api_config;
    case "mainnet":
      return api_config;
    default:
  }
};
