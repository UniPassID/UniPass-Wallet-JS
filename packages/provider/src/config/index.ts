import { UnipassWalletProps } from "../interface/unipassWalletProvider";

export const chain_config = {
  "eth-mainnet": {
    rpc_url: "https://node.wallet.unipass.id/eth-mainnet",
  },
  "polygon-mainnet": {
    rpc_url: "https://node.wallet.unipass.id/polygon-mainnet",
  },
  "bsc-mainnet": {
    rpc_url: "https://node.wallet.unipass.id/bsc-mainnet",
  },
  "rangers-mainnet": {
    rpc_url: "https://node.wallet.unipass.id/rangers-mainnet",
  },
  "eth-goerli": {
    rpc_url: "https://node.wallet.unipass.id/eth-goerli",
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

export const mainnet_api_config = {
  backend: "https://wallet.unipass.id/wallet-v2",
  relayer: {
    eth: "https://wallet.unipass.id/relayer-v2-eth",
    polygon: "https://wallet.unipass.id/relayer-v2-polygon",
    bsc: "https://wallet.unipass.id/relayer-v2-bsc",
    rangers: "https://wallet.unipass.id/relayer-v2-rangers",
  },
};

export const mainnet_preview_api_config = {
  backend: "https://m.wallet.unipass.vip/wallet-v2",
  relayer: {
    eth: "https://m.wallet.unipass.vip/relayer-v2-eth",
    polygon: "https://m.wallet.unipass.vip/relayer-v2-polygon",
    bsc: "https://m.wallet.unipass.vip/relayer-v2-bsc",
    rangers: "https://m.wallet.unipass.vip/relayer-v2-rangers",
  },
};

export const dev_api_config = {
  backend: "https://d.wallet.unipass.vip/wallet-v2",
  relayer: {
    eth: "https://d.wallet.unipass.vip/relayer-v2-eth",
    polygon: "https://d.wallet.unipass.vip/relayer-v2-polygon",
    bsc: "https://d.wallet.unipass.vip/relayer-v2-bsc",
    rangers: "https://d.wallet.unipass.vip/relayer-v2-rangers",
  },
};

export const test_api_config = {
  backend: "https://t.wallet.unipass.vip/wallet-v2",
  relayer: {
    eth: "https://t.wallet.unipass.vip/relayer-v2-eth",
    polygon: "https://t.wallet.unipass.vip/relayer-v2-polygon",
    bsc: "https://t.wallet.unipass.vip/relayer-v2-bsc",
    rangers: "https://t.wallet.unipass.vip/relayer-v2-rangers",
  },
};

export const testnet_api_config = {
  backend: "https://testnet.wallet.unipass.id/wallet-v2",
  relayer: {
    eth: "https://testnet.wallet.unipass.id/relayer-v2-eth",
    polygon: "https://testnet.wallet.unipass.id/relayer-v2-polygon",
    bsc: "https://testnet.wallet.unipass.id/relayer-v2-bsc",
    rangers: "https://testnet.wallet.unipass.id/relayer-v2-rangers",
  },
};

export const getApiConfig = (props: UnipassWalletProps) => {
  if (props.url_config) return props.url_config;
  switch (props.env) {
    case "testnet":
      return test_api_config;
    case "mainnet":
      return mainnet_api_config;
    default:
  }
};
