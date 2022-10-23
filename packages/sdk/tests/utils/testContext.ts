import { BigNumber, constants, Contract, ContractFactory, Overrides, providers, Wallet } from "ethers";
import {
  arrayify,
  BytesLike,
  formatBytes32String,
  hexlify,
  Interface,
  parseEther,
  solidityPack,
  toUtf8String,
} from "ethers/lib/utils";
import { Deployer } from "../../../deployer/src/deployer";
import * as dotenv from "dotenv";
import NodeRSA from "node-rsa";

import ModuleMainArtifact from "../../../../artifacts/unipass-wallet-contracts/contracts/modules/ModuleMain.sol/ModuleMain.json";
import ModuleMainUpgradableArtifact from "../../../../artifacts/unipass-wallet-contracts/contracts/modules/ModuleMainUpgradable.sol/ModuleMainUpgradable.json";
import ModuleMainGasEstimatorArtifact from "../../../../artifacts/unipass-wallet-contracts/contracts/modules/ModuleMainGasEstimator.sol/ModuleMainGasEstimator.json";
import ModuleGuestArtifact from "../../../../artifacts/unipass-wallet-contracts/contracts/modules/ModuleGuest.sol/ModuleGuest.json";
import DkimKeysArtifact from "../../../../artifacts/unipass-wallet-contracts/contracts/DkimKeys.sol/DkimKeys.json";
import WhiteListArtifact from "../../../../artifacts/unipass-wallet-contracts/contracts/modules/commons/ModuleWhiteList.sol/ModuleWhiteList.json";
import TestERC20Artifact from "../../../../artifacts/contracts/tests/TestERC20.sol/TestERC20.json";
import GreeterArtifact from "../../../../artifacts/contracts/tests/Greeter.sol/Greeter.json";
import GasEstimatorArtiface from "../../../../artifacts/unipass-wallet-contracts/contracts/modules/utils/GasEstimator.sol/GasEstimator.json";
import FeeEstimatorArtiface from "../../../../artifacts/unipass-wallet-contracts/contracts/modules/utils/FeeEstimator.sol/FeeEstimator.json";
import { randomKeyset, transferEth } from "./common";
import { UnipassWalletContext, unipassWalletContext as nativeUnipassWalletContext } from "@unipasswallet/network";
import { FakeWallet, Wallet as UnipassWallet, getWalletDeployTransaction } from "@unipasswallet/wallet";
import { LocalRelayer, Relayer } from "@unipasswallet/relayer";
import { EmailType } from "@unipasswallet/dkim-base";

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
  whiteList: Contract;
  whiteListAdmin: Wallet;
  gasEstimator: Contract;
  feeEstimator: Contract;
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

  const unipassPrivateKey = new NodeRSA();
  unipassPrivateKey.importKey(nativeUnipassWalletContext.gasEstimatorDkimPrivateKey);
  unipassPrivateKey.setOptions({ signingScheme: "pkcs1-sha256" });
  const instance = 0;

  const DkimKeys = new ContractFactory(new Interface(DkimKeysArtifact.abi), DkimKeysArtifact.bytecode, signer);
  const dkimKeysAdmin = Wallet.createRandom().connect(provider);
  const dkimKeys = await deployer.deployContract(DkimKeys, instance, txParams, dkimKeysAdmin.address);
  await transferEth(new Wallet(process.env.HARDHAT_PRIVATE_KEY, provider), dkimKeysAdmin.address, parseEther("10"));
  const keyServer = solidityPack(
    ["bytes32", "bytes32"],
    [formatBytes32String("s2055"), formatBytes32String("unipass.com")],
  );
  let ret = await (
    await dkimKeys
      .connect(dkimKeysAdmin)
      .updateDKIMKey(keyServer, unipassPrivateKey.exportKey("components-public").n.subarray(1))
  ).wait();
  expect(ret.status).toEqual(1);

  const WhiteList = new ContractFactory(
    new Interface(WhiteListArtifact.abi),
    WhiteListArtifact.bytecode,
    provider.getSigner(),
  );
  const whiteListAdmin = dkimKeysAdmin;
  const whiteList = await deployer.deployContract(WhiteList, instance, txParams, whiteListAdmin.address);

  const ModuleMainUpgradable = new ContractFactory(
    new Interface(ModuleMainUpgradableArtifact.abi),
    ModuleMainUpgradableArtifact.bytecode,
    provider.getSigner(),
  );
  const moduleMainUpgradable = await deployer.deployContract(
    ModuleMainUpgradable,
    instance,
    txParams,
    dkimKeys.address,
    whiteList.address,
  );

  const ModuleMainGasEstimator = new ContractFactory(
    new Interface(ModuleMainGasEstimatorArtifact.abi),
    ModuleMainGasEstimatorArtifact.bytecode,
  );
  const moduleMainGasEatimator = await deployer.deployContract(
    ModuleMainGasEstimator,
    instance,
    txParams,
    dkimKeys.address,
    whiteList.address,
    moduleMainUpgradable.address,
    true,
  );

  const moduleMainUpgradableGasEatimator = await deployer.deployContract(
    ModuleMainGasEstimator,
    instance,
    txParams,
    dkimKeys.address,
    whiteList.address,
    moduleMainUpgradable.address,
    false,
  );

  const ModuleMain = new ContractFactory(new Interface(ModuleMainArtifact.abi), ModuleMainArtifact.bytecode, signer);
  const moduleMain = await deployer.deployContract(
    ModuleMain,
    instance,
    txParams,
    deployer.singleFactoryContract.address,
    moduleMainUpgradable.address,
    dkimKeys.address,
    whiteList.address,
  );

  const ModuleGuest = new ContractFactory(new Interface(ModuleGuestArtifact.abi), ModuleGuestArtifact.bytecode, signer);
  const moduleGuest = await deployer.deployContract(ModuleGuest, instance, txParams);

  await transferEth(new Wallet(process.env.HARDHAT_PRIVATE_KEY, provider), whiteListAdmin.address, parseEther("10"));

  await transferEth(new Wallet(process.env.HARDHAT_PRIVATE_KEY, provider), dkimKeysAdmin.address, parseEther("100"));

  if (!(await whiteList.connect(whiteListAdmin).isImplementationWhiteList(moduleMainUpgradable.address))) {
    ret = await (
      await whiteList.connect(whiteListAdmin).updateImplementationWhiteList(moduleMainUpgradable.address, true)
    ).wait();
    expect(ret.status).toEqual(1);
  }

  const GasEstimator = new ContractFactory(
    new Interface(GasEstimatorArtiface.abi),
    GasEstimatorArtiface.bytecode,
    signer,
  );
  const gasEstimator = await deployer.deployContract(GasEstimator, instance, txParams);

  const FeeEstimator = new ContractFactory(
    new Interface(FeeEstimatorArtiface.abi),
    FeeEstimatorArtiface.bytecode,
    signer,
  );
  const feeEstimator = await deployer.deployContract(FeeEstimator, instance, txParams);

  const moduleMainGasEstimatorCode = await signer.provider.getCode(moduleMainGasEatimator.address);

  const moduleMainUpgradableGasEstimatorCode = await signer.provider.getCode(moduleMainUpgradableGasEatimator.address);

  const unipassWalletContext: UnipassWalletContext = {
    moduleMain: moduleMain.address,
    moduleMainUpgradable: moduleMainUpgradable.address,
    dkimKeys: dkimKeys.address,
    moduleGuest: moduleGuest.address,
    gasEstimator: gasEstimator.address,
    moduleWhiteList: whiteList.address,
    moduleMainGasEstimatorCode,
    moduleMainUpgradableGasEstimatorCode,
  };

  const relayer = new LocalRelayer(unipassWalletContext, signer);
  // const relayer = new RpcRelayer("http://localhost:3050", unipassWalletContext, provider);

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
    whiteList,
    whiteListAdmin,
    gasEstimator,
    feeEstimator,
  };
}

export interface WalletContext {
  testERC20Token: Contract;
  greeter: Contract;
  wallet: UnipassWallet;
  fakeWallet: FakeWallet;
  metaNonce: number;
  nonce: number;
}

export async function initWalletContext(context: TestContext, toDeploy: boolean): Promise<WalletContext> {
  const TestERC20Token = new ContractFactory(
    new Interface(TestERC20Artifact.abi),
    TestERC20Artifact.bytecode,
    context.provider.getSigner(),
  );
  const testERC20Token = await TestERC20Token.deploy();

  const Greeter = new ContractFactory(
    new Interface(GreeterArtifact.abi),
    GreeterArtifact.bytecode,
    context.provider.getSigner(),
  );
  const greeter = await Greeter.deploy();

  const keyset = randomKeyset(10);
  const wallet = UnipassWallet.create({
    keyset,
    context: context.unipassWalletContext,
    provider: context.provider,
    relayer: context.relayer,
  });

  let ret = await (await testERC20Token.mint(wallet.address, 100)).wait();
  expect(ret.status).toEqual(1);
  expect(await testERC20Token.balanceOf(wallet.address)).toEqual(BigNumber.from(100));

  await transferEth(context.provider.getSigner(), wallet.address, parseEther("100"));

  if (toDeploy) {
    const deployTx = getWalletDeployTransaction(context.unipassWalletContext, wallet.keyset.hash(), constants.Zero);
    deployTx.revertOnError = true;
    ret = await (await wallet.sendTransaction({ type: "Bundled", transactions: deployTx })).wait();
    expect(ret.status).toEqual(1);
  }
  const nonce = 1;
  const metaNonce = 1;

  const options = wallet.options();
  const fakeWallet = new FakeWallet({
    ...options,
    provider: options.provider as providers.JsonRpcProvider,
    rsaEncryptor: async (input: BytesLike) => {
      return hexlify(context.unipassPrivateKey.sign(toUtf8String(arrayify(input))));
    },
    emailType: EmailType.None,
  });

  if (!(await context.whiteList.connect(context.whiteListAdmin).isImplementationWhiteList(greeter.address))) {
    ret = await (
      await context.whiteList.connect(context.whiteListAdmin).updateImplementationWhiteList(greeter.address, true)
    ).wait();
    expect(ret.status).toEqual(1);
  }

  return { testERC20Token, wallet, nonce, metaNonce, greeter, fakeWallet };
}
