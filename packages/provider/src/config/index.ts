const chain_config = {
  polygon: { rpc_url: "https://polygon-rpc.com", chainId: 137, symbol: "Matic" },
  bsc: { rpc_url: "https://bsc-dataseed1.binance.org/", chainId: 56, symbol: "BNB" },
  rangers: { rpc_url: "https://mainnet.rangersprotocol.com/api/jsonrpc", chainId: 2025, symbol: "RPG" },
};

const dev_chain_config = {
  polygon: { rpc_url: "https://polygon-rpc.com", chainId: 137, symbol: "Matic" },
  bsc: { rpc_url: "https://bsc-dataseed1.binance.org/", chainId: 56, symbol: "BNB" },
  rangers: { rpc_url: "https://mainnet.rangersprotocol.com/api/jsonrpc", chainId: 2025, symbol: "RPG" },
};

const api_config = {
  backend: "https://poc-api.wallet.unipass.id",
  relayer: "https://poc-api.wallet.unipass.id/relayer",
};

const dev_api_config = {
  backend: "https://d.wallet.unipass.vip/wallet",
  relayer: "https://d.wallet.unipass.vip/relayer",
};

const test_api_config = {
  backend: "https://t.wallet.unipass.vip/wallet",
  relayer: "https://t.wallet.unipass.vip/relayer",
};

export const getChainConfig = (env: "dev" | "test" | "prod", chainName: "polygon" | "bsc" | "rangers") => {
  switch (env) {
    case "dev":
      return dev_chain_config[chainName];
    case "test":
      return dev_chain_config[chainName];
    case "prod":
      return chain_config[chainName];
    default:
  }
};

export const getApiConfig = (env: "dev" | "test" | "prod") => {
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
