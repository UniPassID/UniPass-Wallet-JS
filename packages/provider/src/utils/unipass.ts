import { providers } from "ethers";
import { Wallet } from "@unipasswallet/wallet";
import { Keyset } from "@unipasswallet/keys";
import { RpcRelayer } from "@unipasswallet/relayer";
import { AuthChainNode, ChainType, Environment, UnipassWalletProps } from "../interface/unipassWalletProvider";
import { MAINNET_UNIPASS_WALLET_CONTEXT, TESTNET_UNIPASS_WALLET_CONTEXT } from "@unipasswallet/network";
import { chain_config, mainnet_api_config, testnet_api_config } from "../config/index";

const genUnipassWalletContext = (env: Environment) => {
  switch (env) {
    case "testnet":
      return TESTNET_UNIPASS_WALLET_CONTEXT;
    case "mainnet":
      return MAINNET_UNIPASS_WALLET_CONTEXT;
    default:
      return MAINNET_UNIPASS_WALLET_CONTEXT;
  }
};

const genProviders = (
  config: UnipassWalletProps,
): {
  polygon: providers.JsonRpcProvider;
  bsc: providers.JsonRpcProvider;
  rangers: providers.JsonRpcProvider;
  eth: providers.JsonRpcProvider;
  scroll?: providers.JsonRpcProvider;
  arbitrum: providers.JsonRpcProvider;
  avalanche: providers.JsonRpcProvider;
  kcc: providers.JsonRpcProvider;
} => {
  let polygon_url = "";
  let bsc_url = "";
  let rangers_url = "";
  let eth_url = "";
  let scroll_url = "";
  let arbitrum_url = "";
  let avalanche_url = "";
  let kcc_url = "";
  switch (config.env) {
    case "testnet":
      eth_url = chain_config["eth-goerli"].rpc_url;
      polygon_url = chain_config["polygon-mumbai"].rpc_url;
      bsc_url = chain_config["bsc-testnet"].rpc_url;
      rangers_url = chain_config["rangers-robin"].rpc_url;
      scroll_url = chain_config["scroll-testnet"].rpc_url;
      arbitrum_url = chain_config["arbitrum-testnet"].rpc_url;
      avalanche_url = chain_config["avalanche-testnet"].rpc_url;
      kcc_url = chain_config["kcc-testnet"].rpc_url;
      break;
    case "mainnet":
      eth_url = chain_config["eth-mainnet"].rpc_url;
      polygon_url = chain_config["polygon-mainnet"].rpc_url;
      bsc_url = chain_config["bsc-mainnet"].rpc_url;
      rangers_url = chain_config["rangers-mainnet"].rpc_url;
      arbitrum_url = chain_config["arbitrum-mainnet"].rpc_url;
      avalanche_url = chain_config["avalanche-mainnet"].rpc_url;
      kcc_url = chain_config["kcc-mainnet"].rpc_url;
      break;
    default:
      eth_url = chain_config["eth-mainnet"].rpc_url;
      polygon_url = chain_config["polygon-mainnet"].rpc_url;
      bsc_url = chain_config["bsc-mainnet"].rpc_url;
      rangers_url = chain_config["rangers-mainnet"].rpc_url;
      arbitrum_url = chain_config["arbitrum-mainnet"].rpc_url;
      avalanche_url = chain_config["avalanche-mainnet"].rpc_url;
      kcc_url = chain_config["kcc-mainnet"].rpc_url;
  }
  const eth = new providers.StaticJsonRpcProvider(eth_url);
  const polygon = new providers.StaticJsonRpcProvider(polygon_url);
  const bsc = new providers.StaticJsonRpcProvider(bsc_url);
  const rangers = new providers.StaticJsonRpcProvider(rangers_url);
  const arbitrum = new providers.StaticJsonRpcProvider(arbitrum_url);
  const avalanche = new providers.StaticJsonRpcProvider(avalanche_url);
  const kcc = new providers.StaticJsonRpcProvider(kcc_url);
  return scroll_url === ""
    ? { polygon, bsc, rangers, eth, scroll: undefined, arbitrum, avalanche, kcc }
    : { polygon, bsc, rangers, eth, scroll: new providers.StaticJsonRpcProvider(scroll_url), arbitrum, avalanche, kcc };
};

const genRelayers = (
  config: UnipassWalletProps,
  ethProvider: providers.JsonRpcProvider,
  polygonProvider: providers.JsonRpcProvider,
  bcdProvider: providers.JsonRpcProvider,
  rangersProvider: providers.JsonRpcProvider,
  arbitrumProvider: providers.JsonRpcProvider,
  avalancheProvider: providers.JsonRpcProvider,
  kccProvider: providers.JsonRpcProvider,
  scrollProvider?: providers.JsonRpcProvider,
): {
  polygon: RpcRelayer;
  bsc: RpcRelayer;
  rangers: RpcRelayer;
  eth: RpcRelayer;
  scroll?: RpcRelayer;
  arbitrum: RpcRelayer;
  avalanche: RpcRelayer;
  kcc: RpcRelayer;
} => {
  let relayer_config: {
    eth: string;
    bsc: string;
    polygon: string;
    rangers: string;
    scroll?: string;
    arbitrum: string;
    avalanche: string;
    kcc: string;
  };
  const context = genUnipassWalletContext(config.env);

  switch (config.env) {
    case "testnet":
      relayer_config = {
        eth: testnet_api_config.relayer.eth,
        bsc: testnet_api_config.relayer.bsc,
        rangers: testnet_api_config.relayer.rangers,
        polygon: testnet_api_config.relayer.polygon,
        scroll: testnet_api_config.relayer.scroll,
        arbitrum: testnet_api_config.relayer.arbitrum,
        avalanche: testnet_api_config.relayer.avalanche,
        kcc: testnet_api_config.relayer.kcc,
      };
      break;
    case "mainnet":
      relayer_config = {
        eth: mainnet_api_config.relayer.eth,
        bsc: mainnet_api_config.relayer.bsc,
        rangers: mainnet_api_config.relayer.rangers,
        polygon: mainnet_api_config.relayer.polygon,
        arbitrum: mainnet_api_config.relayer.arbitrum,
        avalanche: mainnet_api_config.relayer.avalanche,
        kcc: mainnet_api_config.relayer.kcc,
      };
      break;
    default:
      relayer_config = {
        eth: mainnet_api_config.relayer.eth,
        bsc: mainnet_api_config.relayer.bsc,
        rangers: mainnet_api_config.relayer.rangers,
        polygon: mainnet_api_config.relayer.polygon,
        arbitrum: mainnet_api_config.relayer.arbitrum,
        avalanche: mainnet_api_config.relayer.avalanche,
        kcc: mainnet_api_config.relayer.kcc,
      };
  }
  relayer_config = config?.url_config?.relayer || relayer_config;

  const eth = new RpcRelayer(relayer_config.eth, context, ethProvider);
  const polygon = new RpcRelayer(relayer_config.polygon, context, polygonProvider);
  const bsc = new RpcRelayer(relayer_config.bsc, context, bcdProvider);
  const rangers = new RpcRelayer(relayer_config.rangers, context, rangersProvider);
  const scroll = relayer_config.scroll ? new RpcRelayer(relayer_config.scroll, context, scrollProvider) : undefined;
  const arbitrum = new RpcRelayer(relayer_config.arbitrum, context, arbitrumProvider);
  const avalanche = new RpcRelayer(relayer_config.avalanche, context, avalancheProvider);
  const kcc = new RpcRelayer(relayer_config.kcc, context, avalancheProvider);

  return { polygon, bsc, rangers, eth, scroll, arbitrum, avalanche, kcc };
};
export class WalletsCreator {
  public static instance: WalletsCreator;

  public eth: Wallet;

  public polygon: Wallet;

  public bsc: Wallet;

  public rangers: Wallet;

  public scroll?: Wallet;

  public arbitrum: Wallet;

  public avalanche: Wallet;

  public kcc: Wallet;

  static getInstance(keyset: Keyset, address: string, config: UnipassWalletProps) {
    if (!WalletsCreator.instance) {
      const ins = new WalletsCreator(keyset, address, config);
      WalletsCreator.instance = ins;
    }
    WalletsCreator.instance.eth.address = address;
    WalletsCreator.instance.eth.keyset = keyset;

    WalletsCreator.instance.polygon.address = address;
    WalletsCreator.instance.polygon.keyset = keyset;

    WalletsCreator.instance.bsc.address = address;
    WalletsCreator.instance.bsc.keyset = keyset;

    WalletsCreator.instance.rangers.address = address;
    WalletsCreator.instance.rangers.keyset = keyset;

    WalletsCreator.instance.arbitrum.address = address;
    WalletsCreator.instance.arbitrum.keyset = keyset;

    WalletsCreator.instance.avalanche.address = address;
    WalletsCreator.instance.avalanche.keyset = keyset;

    WalletsCreator.instance.kcc.address = address;
    WalletsCreator.instance.kcc.keyset = keyset;

    if (WalletsCreator.instance.scroll) {
      WalletsCreator.instance.scroll.address = address;
      WalletsCreator.instance.scroll.keyset = keyset;
    }

    return WalletsCreator.instance;
  }

  private constructor(keyset: Keyset, address: string, config: UnipassWalletProps) {
    const context = genUnipassWalletContext(config.env);
    const {
      eth: ethProvider,
      polygon: polygonProvider,
      bsc: bscProvider,
      rangers: rangersProvider,
      scroll: scrollProvider = undefined,
      arbitrum: arbitrumProvider,
      avalanche: avalancheProvider,
      kcc: kccProvider,
    } = genProviders(config);
    const {
      eth: ethRelayer,
      polygon: polygonRelayer,
      bsc: bscRelayer,
      rangers: rangersRelayer,
      scroll: scrollRelayer = undefined,
      arbitrum: arbitrumRelayer,
      avalanche: avalancheRelayer,
      kcc: kccRelayer,
    } = genRelayers(
      config,
      ethProvider,
      polygonProvider,
      bscProvider,
      rangersProvider,
      arbitrumProvider,
      avalancheProvider,
      kccProvider,
      scrollProvider,
    );

    this.eth = Wallet.create({
      address,
      keyset,
      provider: ethProvider,
      relayer: ethRelayer,
      context,
    });
    this.polygon = Wallet.create({
      keyset,
      provider: polygonProvider,
      relayer: polygonRelayer,
      address,
    });
    this.bsc = Wallet.create({ address, keyset, provider: bscProvider, relayer: bscRelayer, context });
    this.rangers = Wallet.create({
      keyset,
      provider: rangersProvider,
      relayer: rangersRelayer,
      address,
      context,
    });
    this.scroll = scrollProvider
      ? Wallet.create({
          keyset,
          provider: scrollProvider,
          relayer: scrollRelayer,
          address,
          context,
        })
      : undefined;
    this.arbitrum = Wallet.create({
      keyset,
      provider: arbitrumProvider,
      relayer: arbitrumRelayer,
      address,
      context,
    });
    this.avalanche = Wallet.create({
      keyset,
      provider: avalancheProvider,
      relayer: avalancheRelayer,
      address,
      context,
    });
    this.kcc = Wallet.create({
      keyset,
      provider: kccProvider,
      relayer: kccRelayer,
      address,
      context,
    });
  }

  static getPolygonProvider(keyset: Keyset, env: Environment): Wallet {
    let polygon_url = "";
    switch (env) {
      case "testnet":
        polygon_url = chain_config["polygon-mumbai"].rpc_url;
        break;
      case "mainnet":
        polygon_url = chain_config["polygon-mainnet"].rpc_url;
        break;
      default:
        polygon_url = chain_config["polygon-mainnet"].rpc_url;
    }
    return Wallet.create({
      keyset,
      provider: new providers.JsonRpcProvider(polygon_url),
    });
  }
}

export const getAuthNodeChain = (env: Environment, chainType: ChainType): AuthChainNode => {
  if (env === "testnet") {
    switch (chainType) {
      case "eth":
        return "eth-goerli";
      case "polygon":
        return "polygon-mumbai";
      case "bsc":
        return "bsc-testnet";
      case "rangers":
        return "rangers-robin";
      case "scroll":
        return "scroll-testnet";
      case "arbitrum":
        return "arbitrum-testnet";
      case "avalanche":
        return "avalanche-testnet";
      case "kcc":
        return "kcc-testnet";
      default:
        return "polygon-mumbai";
    }
  } else if (env === "mainnet") {
    switch (chainType) {
      case "eth":
        return "eth-mainnet";
      case "polygon":
        return "polygon-mainnet";
      case "bsc":
        return "bsc-mainnet";
      case "rangers":
        return "rangers-mainnet";
      case "arbitrum":
        return "arbitrum-mainnet";
      case "scroll":
        throw new Error("Unsupported For Mainnet Scroll");
      case "avalanche":
        return "avalanche-mainnet";
      case "kcc":
        return "kcc-mainnet";
      default:
        return "polygon-mainnet";
    }
  }
};
