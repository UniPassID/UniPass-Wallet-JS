import { Environment, ChainName } from "../interface/unipassWalletProvider";

const chain_config = {
  "polygon-mainnet": {
    rpc_url: "https://node.wallet.unipass.id/polygon-mainnet",
  },
  "bsc-mainnet": {
    rpc_url: "https://node.wallet.unipass.id/polygon-mumbai",
  },
  "rangers-mainnet": {
    rpc_url: "https://node.wallet.unipass.id/rangers-mainnet",
  },
};

const dev_chain_config = {
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

const api_config = {
  backend: "https://poc-api.wallet.unipass.id",
  relayer: "https://poc-api.wallet.unipass.id/relayer",
};

const dev_api_config = {
  backend: "https://d.wallet.unipass.vip/wallet",
  relayer: "https://d.wallet.unipass.vip/relayer-rs",
};

const test_api_config = {
  backend: "https://t.wallet.unipass.vip/wallet",
  relayer: "https://t.wallet.unipass.vip/relayer",
};

export const getChainConfig = (
  env: Environment,
  nodeName: ChainName,
): { rpc_url: string; chainId: number; symbol: string } => {
  switch (env) {
    case "dev":
      return dev_chain_config[nodeName];
    case "test":
      return dev_chain_config[nodeName];
    case "prod":
      return chain_config[nodeName];
    default:
      return dev_chain_config[nodeName];
  }
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
