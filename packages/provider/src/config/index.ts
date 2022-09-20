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
    rpc_url: "https://polygon-testnet.public.blastapi.io",
  },
  "bsc-testnet": {
    rpc_url: "https://data-seed-prebsc-1-s1.binance.org:8545",
  },
  "rangers-robin": {
    rpc_url: "https://robin.rangersprotocol.com/api/jsonrpc",
  },
};

export const api_config = {
  backend: "https://poc-api.wallet.unipass.id",
  relayer: "https://poc-api.wallet.unipass.id/relayer",
};

export const dev_api_config = {
  backend: "https://d.wallet.unipass.vip/wallet",
  relayer: "https://d.wallet.unipass.vip/relayer-rs",
};

export const test_api_config = {
  backend: "https://t.wallet.unipass.vip/wallet",
  relayer: "https://d.wallet.unipass.vip/relayer-rs",
};

export const getApiConfig = (env: Environment) => {
  switch (env) {
    case "dev":
      return dev_api_config;
    case "test":
      return test_api_config;
    case "prod":
      return api_config;
    default:
  }
};
