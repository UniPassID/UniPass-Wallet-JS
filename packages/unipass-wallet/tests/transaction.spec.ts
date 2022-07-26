import { BigNumber, Contract, ContractFactory, ethers, Wallet } from "ethers";
import { Interface, randomBytes } from "ethers/lib/utils";
import NodeRsa from "node-rsa";
import * as dotenv from "dotenv";

import ModuleMainArtifact from "../../../artifacts/unipass-wallet-contracts/contracts/modules/ModuleMain.sol/ModuleMain.json";
import FactoryArtifact from "../../../artifacts/unipass-wallet-contracts/contracts/Factory.sol/Factory.json";
import DkimKeysArtifact from "../../../artifacts/unipass-wallet-contracts/contracts/DkimKeys.sol/DkimKeys.json";
import TestERC20Artifact from "../../../artifacts/contracts/tests/TestERC20.sol/TestERC20.json";
import {
  CallTxBuilder,
  UpdateKeysetHashTxBuilder,
} from "../src/transactionBuilder";
import {
  generateDkimParams,
  generateRecoveryEmails,
  getKeysetHash,
  getProxyAddress,
  optimalGasLimit,
  transferEth,
} from "./utils/common";
import {
  MasterKeySigGenerator,
  RecoveryEmailsSigGenerator,
  SessionKeySigGenerator,
  SignType,
} from "../src/sigGenerator";
import { RecoveryEmails } from "../src/recoveryEmails";
import { TxExcutor } from "../src/txExecutor";
import { pureEmailHash } from "unipass-wallet-dkim-base";

describe("Test ModuleMain", () => {
  let moduleMain: Contract;
  let ModuleMain: ContractFactory;
  let provider: ethers.providers.JsonRpcProvider;
  let proxyModuleMain: Contract;
  let factory: Contract;
  let dkimKeys: Contract;
  let masterKey: Wallet;
  let keysetHash: string;
  let threshold: number;
  let recoveryEmails: string[];
  let dkimKeysAdmin: Wallet;
  let chainId: number;
  let TestERC20Token: ContractFactory;
  let testERC20Token: Contract;
  let JsonRpcNode;
  let UnipassPrivateKey;
  beforeAll(async () => {
    dotenv.config({ path: `${__dirname}/../../../.env` });
    JsonRpcNode = process.env.JSON_RPC_NODE;
    UnipassPrivateKey = process.env.UNIPASS_PRIVATE_KEY;
    provider = new ethers.providers.JsonRpcProvider(JsonRpcNode);
    chainId = (await provider.getNetwork()).chainId;
    const Factory = new ContractFactory(
      new Interface(FactoryArtifact.abi),
      FactoryArtifact.bytecode,
      provider.getSigner()
    );
    factory = await Factory.deploy();
    const DkimKeys = new ContractFactory(
      new Interface(DkimKeysArtifact.abi),
      DkimKeysArtifact.bytecode,
      provider.getSigner()
    );
    dkimKeysAdmin = Wallet.createRandom().connect(provider);
    dkimKeys = await DkimKeys.deploy(dkimKeysAdmin.address);
    const nodeRsa = new NodeRsa(UnipassPrivateKey);
    const keyServer = ethers.utils.solidityPack(
      ["bytes", "bytes"],
      [Buffer.from("s2055"), Buffer.from("unipass.com")]
    );

    await transferEth(
      new Wallet(process.env.HARDHAT_PRIVATE_KEY, provider),
      dkimKeysAdmin.address,
      ethers.utils.parseEther("10")
    );
    (
      await dkimKeys
        .connect(dkimKeysAdmin)
        .updateDKIMKey(
          keyServer,
          nodeRsa.exportKey("components-public").n.subarray(1)
        )
    ).wait();
    ModuleMain = new ContractFactory(
      new Interface(ModuleMainArtifact.abi),
      ModuleMainArtifact.bytecode,
      provider.getSigner()
    );
    moduleMain = await ModuleMain.deploy(factory.address);
    TestERC20Token = new ContractFactory(
      new Interface(TestERC20Artifact.abi),
      TestERC20Artifact.bytecode,
      provider.getSigner()
    );
  });
  beforeEach(async () => {
    testERC20Token = await TestERC20Token.deploy();
    threshold = 4;
    masterKey = Wallet.createRandom();

    recoveryEmails = generateRecoveryEmails(10);
    keysetHash = getKeysetHash(masterKey.address, threshold, recoveryEmails);

    let ret = await (
      await factory.deploy(moduleMain.address, keysetHash, dkimKeys.address)
    ).wait();
    expect(ret.status).toEqual(1);

    const expectedAddress = getProxyAddress(
      moduleMain.address,
      dkimKeys.address,
      factory.address,
      keysetHash
    );
    proxyModuleMain = ModuleMain.attach(expectedAddress);
    const txRet = await provider.getSigner().sendTransaction({
      to: proxyModuleMain.address,
      value: ethers.utils.parseEther("100"),
    });
    expect((await txRet.wait()).status).toEqual(1);
    expect(await proxyModuleMain.getKeysetHash()).toEqual(keysetHash);
    ret = await (
      await testERC20Token.mint(proxyModuleMain.address, 100)
    ).wait();
    expect(ret.status).toEqual(1);
    expect(await testERC20Token.balanceOf(proxyModuleMain.address)).toEqual(
      BigNumber.from(100)
    );
  });
  it("Updating KeysetHash By Master Key Should Success", async () => {
    const newKeysetHash = Buffer.from(randomBytes(32));
    const txBuilder = new UpdateKeysetHashTxBuilder(
      proxyModuleMain.address,
      2,
      newKeysetHash
    );
    const masterKeySigGenerator = new MasterKeySigGenerator(
      masterKey,
      new RecoveryEmails(threshold, recoveryEmails)
    );
    const tx = (
      await txBuilder.generateSigByMasterKey(
        masterKeySigGenerator,
        SignType.EthSign
      )
    ).build();
    const txExecutor = await new TxExcutor(
      chainId,
      1,
      [tx],
      ethers.constants.AddressZero,
      ethers.constants.Zero,
      ethers.constants.AddressZero
    ).generateSigByMasterKey(masterKeySigGenerator, SignType.EthSign);
    const ret = await (
      await txExecutor.execute(proxyModuleMain, optimalGasLimit)
    ).wait();
    expect(ret.status).toEqual(1);
    expect(await proxyModuleMain.getKeysetHash()).toEqual(
      `0x${newKeysetHash.toString("hex")}`
    );
  });

  it("Updating KeysetHash By Recovery Emails Should Success", async () => {
    const newKeysetHash = Buffer.from(randomBytes(32));
    const txBuilder = new UpdateKeysetHashTxBuilder(
      proxyModuleMain.address,
      2,
      newKeysetHash
    );
    const recoveryEmailsSigGeneraror = new RecoveryEmailsSigGenerator(
      masterKey.address,
      new RecoveryEmails(threshold, recoveryEmails)
    );
    const subject = txBuilder.digestMessage();
    const tx = (
      await txBuilder.generateSigByRecoveryEmails(
        recoveryEmailsSigGeneraror,
        await generateDkimParams(
          recoveryEmails,
          subject,
          [1, 2, 3, 4, 5],
          UnipassPrivateKey
        )
      )
    ).build();
    const txExecutor = await new TxExcutor(
      chainId,
      1,
      [tx],
      ethers.constants.AddressZero,
      ethers.constants.Zero,
      ethers.constants.AddressZero
    ).generateSigBySigNone();
    const ret = await (
      await txExecutor.execute(proxyModuleMain, optimalGasLimit)
    ).wait();
    expect(ret.status).toEqual(1);
    expect(await proxyModuleMain.getKeysetHash()).toEqual(
      `0x${newKeysetHash.toString("hex")}`
    );
  });
  it("Transfer ERC20 Should Success", async () => {
    const data = testERC20Token.interface.encodeFunctionData("transfer", [
      dkimKeysAdmin.address,
      10,
    ]);
    const tx = new CallTxBuilder(
      ethers.constants.Zero,
      testERC20Token.address,
      ethers.constants.Zero,
      data
    ).build();
    const masterKeySigGenerator = new MasterKeySigGenerator(
      masterKey,
      new RecoveryEmails(threshold, recoveryEmails)
    );
    const sessoinKey = Wallet.createRandom();
    const sessionKeySigGenerator = await new SessionKeySigGenerator(
      sessoinKey,
      Math.ceil(Date.now() / 1000) + 1000,
      new RecoveryEmails(threshold, recoveryEmails)
    ).init(masterKeySigGenerator, SignType.EthSign);
    const txExecutor = await new TxExcutor(
      chainId,
      1,
      [tx],
      ethers.constants.AddressZero,
      ethers.constants.Zero,
      ethers.constants.AddressZero
    ).generateSigBySessionKey(sessionKeySigGenerator, SignType.EthSign);

    const ret = await (
      await txExecutor.execute(proxyModuleMain, optimalGasLimit)
    ).wait();
    expect(ret.status).toEqual(1);
    expect(await testERC20Token.balanceOf(dkimKeysAdmin.address)).toEqual(
      BigNumber.from(10)
    );
  });
  it("Transfer ETH Should Success", async () => {
    const to = Wallet.createRandom();
    const tx = new CallTxBuilder(
      ethers.constants.Zero,
      to.address,
      ethers.utils.parseEther("10"),
      "0x"
    ).build();
    const masterKeySigGenerator = new MasterKeySigGenerator(
      masterKey,
      new RecoveryEmails(threshold, recoveryEmails)
    );
    const sessoinKey = Wallet.createRandom();
    const sessionKeySigGenerator = await new SessionKeySigGenerator(
      sessoinKey,
      Math.ceil(Date.now() / 1000) + 1000,
      new RecoveryEmails(threshold, recoveryEmails)
    ).init(masterKeySigGenerator, SignType.EthSign);
    const txExecutor = await new TxExcutor(
      chainId,
      1,
      [tx],
      ethers.constants.AddressZero,
      ethers.constants.Zero,
      ethers.constants.AddressZero
    ).generateSigBySessionKey(sessionKeySigGenerator, SignType.EthSign);

    const ret = await (
      await txExecutor.execute(proxyModuleMain, optimalGasLimit)
    ).wait();
    expect(ret.status).toEqual(1);
    expect(
      Number.parseInt(
        ethers.utils.formatEther(await provider.getBalance(to.address)),
        10
      )
    ).toEqual(10);
  });
  it("Dkim Verify Should Success", async function () {
    const subject = ethers.constants.HashZero;
    const emails = await generateDkimParams(
      recoveryEmails,
      subject,
      [1, 2, 3, 4, 5],
      UnipassPrivateKey
    );
    const ret = await emails
      .get(recoveryEmails[1])
      .dkimVerify(proxyModuleMain, recoveryEmails[1]);
    expect(ret[0]).toBe(true);
    expect(ret[1]).toBe(pureEmailHash(recoveryEmails[1]));
    expect(ret[2]).toBe(`0x${Buffer.from(subject).toString("hex")}`);
  });
});
