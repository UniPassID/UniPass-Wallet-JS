import {
  BigNumber,
  Contract,
  ContractFactory,
  Overrides,
  providers,
  Wallet,
} from "ethers";
import {
  formatBytes32String,
  Interface,
  parseEther,
  solidityPack,
} from "ethers/lib/utils";
import { Deployer } from "../../../deployer/src/deployer";
import * as dotenv from "dotenv";
import NodeRSA from "node-rsa";

import ModuleMainArtifact from "../../../../artifacts/unipass-wallet-contracts/contracts/modules/ModuleMain.sol/ModuleMain.json";
import ModuleMainUpgradableArtifact from "../../../../artifacts/unipass-wallet-contracts/contracts/modules/ModuleMainUpgradable.sol/ModuleMainUpgradable.json";
import ModuleGuestArtifact from "../../../../artifacts/unipass-wallet-contracts/contracts/modules/ModuleGuest.sol/ModuleGuest.json";
import DkimKeysArtifact from "../../../../artifacts/unipass-wallet-contracts/contracts/DkimKeys.sol/DkimKeys.json";
import WhiteListArtifact from "../../../../artifacts/unipass-wallet-contracts/contracts/modules/commons/ModuleWhiteList.sol/ModuleWhiteList.json";
import TestERC20Artifact from "../../../../artifacts/contracts/tests/TestERC20.sol/TestERC20.json";
import { randomKeyset, transferEth } from "./common";
import { UnipassWalletContext } from "@unipasswallet/network";
import { Wallet as UnipassWallet } from "@unipasswallet/wallet";
import { LocalRelayer, Relayer } from "@unipasswallet/relayer";

export interface TestContext {
  provider: providers.JsonRpcProvider;
  chainId: number;
  deployer: Deployer;
  txParams: Overrides;
  unipassPrivateKey: NodeRSA;
  instance: number;
  dkimKeysAdmin: Wallet;
  dkimKeys: Contract;
  moduleMain: Contract;
  moduleMainUpgradable: Contract;
  moduleGuest: Contract;
  unipassWalletContext: UnipassWalletContext;
  relayer: Relayer;
}

export async function initTestContext(): Promise<TestContext> {
  dotenv.config({ path: `${__dirname}/../../../../.env` });
  const jsonRpcNode = process.env.JSON_RPC_NODE;
  const provider = new providers.JsonRpcProvider(jsonRpcNode);
  const { chainId } = await provider.getNetwork();

  const signer = provider.getSigner();
  const deployer = await new Deployer(signer).init();
  const txParams = {
    gasLimit: 10000000,
    gasPrice: (await signer.getGasPrice()).mul(12).div(10),
  };

  const unipassPrivateKey = new NodeRSA({ b: 2048 });
  const instance = 0;

  const DkimKeys = new ContractFactory(
    new Interface(DkimKeysArtifact.abi),
    DkimKeysArtifact.bytecode,
    signer
  );
  const dkimKeysAdmin = Wallet.createRandom().connect(provider);
  const dkimKeys = await deployer.deployContract(
    DkimKeys,
    instance,
    txParams,
    dkimKeysAdmin.address
  );
  await transferEth(
    new Wallet(process.env.HARDHAT_PRIVATE_KEY, provider),
    dkimKeysAdmin.address,
    parseEther("10")
  );
  const keyServer = solidityPack(
    ["bytes32", "bytes32"],
    [formatBytes32String("s2055"), formatBytes32String("unipass.com")]
  );
  let ret = await (
    await dkimKeys
      .connect(dkimKeysAdmin)
      .updateDKIMKey(
        keyServer,
        unipassPrivateKey.exportKey("components-public").n.subarray(1)
      )
  ).wait();
  expect(ret.status).toEqual(1);

  const WhiteList = new ContractFactory(
    new Interface(WhiteListArtifact.abi),
    WhiteListArtifact.bytecode,
    provider.getSigner()
  );
  const whiteListAdmin = Wallet.createRandom().connect(provider);
  const whiteList = await deployer.deployContract(
    WhiteList,
    instance,
    txParams,
    whiteListAdmin.address
  );

  const ModuleMainUpgradable = new ContractFactory(
    new Interface(ModuleMainUpgradableArtifact.abi),
    ModuleMainUpgradableArtifact.bytecode,
    provider.getSigner()
  );
  const moduleMainUpgradable = await deployer.deployContract(
    ModuleMainUpgradable,
    instance,
    txParams,
    dkimKeys.address,
    whiteList.address
  );

  const ModuleMain = new ContractFactory(
    new Interface(ModuleMainArtifact.abi),
    ModuleMainArtifact.bytecode,
    signer
  );
  const moduleMain = await deployer.deployContract(
    ModuleMain,
    instance,
    txParams,
    deployer.singleFactoryContract.address,
    moduleMainUpgradable.address,
    dkimKeys.address,
    whiteList.address
  );

  const ModuleGuest = new ContractFactory(
    new Interface(ModuleGuestArtifact.abi),
    ModuleGuestArtifact.bytecode,
    signer
  );
  const moduleGuest = await deployer.deployContract(
    ModuleGuest,
    instance,
    txParams
  );

  await transferEth(
    new Wallet(process.env.HARDHAT_PRIVATE_KEY, provider),
    whiteListAdmin.address,
    parseEther("10")
  );

  await transferEth(
    new Wallet(process.env.HARDHAT_PRIVATE_KEY, provider),
    "0xe605b64e3688f0f0c21bb0fd65aa10186f4b4f36",
    parseEther("10")
  );

  ret = await (
    await whiteList
      .connect(whiteListAdmin)
      .updateImplementationWhiteList(moduleMainUpgradable.address, true)
  ).wait();
  expect(ret.status).toEqual(1);

  const unipassWalletContext: UnipassWalletContext = {
    moduleMain: moduleMain.address,
    moduleMainUpgradable: moduleMainUpgradable.address,
    dkimKeys: dkimKeys.address,
    moduleGuest: moduleGuest.address,
  };

  const relayer = new LocalRelayer(unipassWalletContext, signer);

  return {
    provider,
    chainId,
    deployer,
    txParams,
    unipassPrivateKey,
    instance,
    dkimKeysAdmin,
    moduleMain,
    moduleMainUpgradable,
    dkimKeys,
    moduleGuest,
    unipassWalletContext,
    relayer,
  };
}

export interface WalletContext {
  testERC20Token: Contract;
  wallet: UnipassWallet;
  metaNonce: number;
  nonce: number;
}

export async function initWalletContext(
  context: TestContext
): Promise<WalletContext> {
  const TestERC20Token = new ContractFactory(
    new Interface(TestERC20Artifact.abi),
    TestERC20Artifact.bytecode,
    context.provider.getSigner()
  );
  const testERC20Token = await TestERC20Token.deploy();
  const keyset = randomKeyset(10);
  const wallet = UnipassWallet.create(
    keyset,
    context.unipassWalletContext,
    true,
    context.provider,
    context.relayer,
    BigNumber.from(10_000_000)
  );

  const nonce = 1;
  const metaNonce = 1;

  const ret = await (await testERC20Token.mint(wallet.address, 100)).wait();
  expect(ret.status).toEqual(1);
  expect(await testERC20Token.balanceOf(wallet.address)).toEqual(
    BigNumber.from(100)
  );

  await transferEth(
    context.provider.getSigner(),
    wallet.address,
    parseEther("100")
  );

  return { testERC20Token, wallet, nonce, metaNonce };
}
