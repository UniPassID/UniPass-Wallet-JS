import {
  BigNumber,
  constants,
  Contract,
  ContractFactory,
  Overrides,
  providers,
  utils,
  Wallet,
} from "ethers";
import { hexlify, Interface, randomBytes } from "ethers/lib/utils";
import NodeRsa from "node-rsa";
import * as dotenv from "dotenv";

import ModuleMainArtifact from "../../../artifacts/unipass-wallet-contracts/contracts/modules/ModuleMain.sol/ModuleMain.json";
import ModuleMainUpgradableArtifact from "../../../artifacts/unipass-wallet-contracts/contracts/modules/ModuleMainUpgradable.sol/ModuleMainUpgradable.json";
import DkimKeysArtifact from "../../../artifacts/unipass-wallet-contracts/contracts/DkimKeys.sol/DkimKeys.json";
import TestERC20Artifact from "../../../artifacts/contracts/tests/TestERC20.sol/TestERC20.json";
import GreeterArtifact from "../../../artifacts/contracts/tests/Greeter.sol/Greeter.json";
import {
  CallTxBuilder,
  UpdateKeysetHashTxBuilder,
  UpdateTimeLockDuringTxBuilder,
} from "../src/transactionBuilder";
import {
  generateDkimParams,
  generateRecoveryEmails,
  getKeysetHash,
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
import { Deployer } from "../src/deployer";
import { UnlockKeysetHashTxBuilder } from "../src/transactionBuilder/unlockKeysetHashTxBuilder";
import { CancelLockKeysetHashTxBuilder } from "../src/transactionBuilder/cancelLockKeysetHsahTxBuilder";
import { UpdateImplementationTxBuilder } from "../src/transactionBuilder/updateImplementationTxBuilder";

describe("Test ModuleMain", () => {
  let moduleMainUpgradable: Contract;
  let ModuleMainUpgradable: ContractFactory;
  let moduleMain: Contract;
  let ModuleMain: ContractFactory;
  let provider: providers.JsonRpcProvider;
  let deployer: Deployer;
  let txParams: Overrides;
  let proxyModuleMain: Contract;
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
  let nonce: number;
  let metaNonce: number;
  beforeAll(async () => {
    dotenv.config({ path: `${__dirname}/../../../.env` });
    JsonRpcNode = process.env.JSON_RPC_NODE;
    UnipassPrivateKey = process.env.UNIPASS_PRIVATE_KEY;
    provider = new providers.JsonRpcProvider(JsonRpcNode);
    chainId = (await provider.getNetwork()).chainId;
    const signer = provider.getSigner();

    deployer = await new Deployer(signer).init();
    const DkimKeys = new ContractFactory(
      new Interface(DkimKeysArtifact.abi),
      DkimKeysArtifact.bytecode,
      provider.getSigner()
    );
    txParams = {
      gasLimit: 6000000,
      gasPrice: (await signer.getGasPrice()).mul(12).div(10),
    };
    const instance = 0;

    dkimKeysAdmin = Wallet.createRandom().connect(provider);
    dkimKeys = await deployer.deployContract(
      DkimKeys,
      instance,
      txParams,
      dkimKeysAdmin.address
    );

    const nodeRsa = new NodeRsa(UnipassPrivateKey);
    const keyServer = utils.solidityPack(
      ["bytes", "bytes"],
      [Buffer.from("s2055"), Buffer.from("unipass.com")]
    );

    await transferEth(
      new Wallet(process.env.HARDHAT_PRIVATE_KEY, provider),
      dkimKeysAdmin.address,
      utils.parseEther("10")
    );
    (
      await dkimKeys
        .connect(dkimKeysAdmin)
        .updateDKIMKey(
          keyServer,
          nodeRsa.exportKey("components-public").n.subarray(1)
        )
    ).wait();
    ModuleMainUpgradable = new ContractFactory(
      new Interface(ModuleMainUpgradableArtifact.abi),
      ModuleMainUpgradableArtifact.bytecode,
      provider.getSigner()
    );
    moduleMainUpgradable = await deployer.deployContract(
      ModuleMainUpgradable,
      instance,
      txParams,
      dkimKeys.address
    );
    ModuleMain = new ContractFactory(
      new Interface(ModuleMainArtifact.abi),
      ModuleMainArtifact.bytecode,
      provider.getSigner()
    );
    moduleMain = await deployer.deployContract(
      ModuleMain,
      instance,
      txParams,
      deployer.singleFactoryContract.address,
      moduleMainUpgradable.address,
      dkimKeys.address
    );
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

    proxyModuleMain = await deployer.deployProxyContract(
      moduleMain.interface,
      moduleMain.address,
      keysetHash,
      txParams
    );
    const txRet = await provider.getSigner().sendTransaction({
      to: proxyModuleMain.address,
      value: utils.parseEther("100"),
    });
    expect((await txRet.wait()).status).toEqual(1);
    const ret = await (
      await testERC20Token.mint(proxyModuleMain.address, 100)
    ).wait();
    expect(ret.status).toEqual(1);
    expect(await testERC20Token.balanceOf(proxyModuleMain.address)).toEqual(
      BigNumber.from(100)
    );
    nonce = 1;
    metaNonce = 1;
  });
  it("Updating KeysetHash By Master Key Should Success", async () => {
    const newKeysetHash = Buffer.from(randomBytes(32));
    const txBuilder = new UpdateKeysetHashTxBuilder(
      proxyModuleMain.address,
      metaNonce,
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
      nonce,
      [tx],
      constants.AddressZero,
      constants.Zero,
      constants.AddressZero
    ).generateSigByMasterKey(masterKeySigGenerator, SignType.EthSign);
    const ret = await (
      await txExecutor.execute(proxyModuleMain, { gasLimit: optimalGasLimit })
    ).wait();
    expect(ret.status).toEqual(1);
    expect(await proxyModuleMain.lockedKeysetHash()).toEqual(
      `0x${newKeysetHash.toString("hex")}`
    );
    metaNonce++;
    nonce++;
  });

  it("Updating KeysetHash By Recovery Emails Should Success", async () => {
    const newKeysetHash = Buffer.from(randomBytes(32));
    const txBuilder = new UpdateKeysetHashTxBuilder(
      proxyModuleMain.address,
      metaNonce,
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
      nonce,
      [tx],
      constants.AddressZero,
      constants.Zero,
      constants.AddressZero
    ).generateSigBySigNone();
    const ret = await (
      await txExecutor.execute(proxyModuleMain, { gasLimit: optimalGasLimit })
    ).wait();
    expect(ret.status).toEqual(1);
    expect(await proxyModuleMain.lockedKeysetHash()).toEqual(
      `0x${newKeysetHash.toString("hex")}`
    );
    metaNonce++;
    nonce++;
  });

  it("Updating KeysetHash By MasterKey And Recovery Emails Should Success", async () => {
    const newKeysetHash = Buffer.from(randomBytes(32));
    const txBuilder = new UpdateKeysetHashTxBuilder(
      proxyModuleMain.address,
      metaNonce,
      newKeysetHash
    );
    const masterKeySigGenerator = new MasterKeySigGenerator(
      masterKey,
      new RecoveryEmails(threshold, recoveryEmails)
    );
    const subject = txBuilder.digestMessage();
    const tx = (
      await txBuilder.generateSigByMasterKeyWithDkimParams(
        masterKeySigGenerator,
        SignType.EthSign,
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
      nonce,
      [tx],
      constants.AddressZero,
      constants.Zero,
      constants.AddressZero
    ).generateSigBySigNone();
    const ret = await (
      await txExecutor.execute(proxyModuleMain, { gasLimit: optimalGasLimit })
    ).wait();
    expect(ret.status).toEqual(1);
    expect(await proxyModuleMain.getKeysetHash()).toEqual(
      hexlify(newKeysetHash)
    );
    metaNonce++;
    nonce++;
  });
  it("Transfer ERC20 Should Success", async () => {
    const data = testERC20Token.interface.encodeFunctionData("transfer", [
      dkimKeysAdmin.address,
      10,
    ]);
    const tx = new CallTxBuilder(
      constants.Zero,
      testERC20Token.address,
      constants.Zero,
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
      nonce,
      [tx],
      constants.AddressZero,
      constants.Zero,
      constants.AddressZero
    ).generateSigBySessionKey(sessionKeySigGenerator, SignType.EthSign);

    const ret = await (
      await txExecutor.execute(proxyModuleMain, { gasLimit: optimalGasLimit })
    ).wait();
    expect(ret.status).toEqual(1);
    expect(await testERC20Token.balanceOf(dkimKeysAdmin.address)).toEqual(
      BigNumber.from(10)
    );
    nonce++;
  });
  it("Transfer ETH Should Success", async () => {
    const to = Wallet.createRandom();
    const tx = new CallTxBuilder(
      constants.Zero,
      to.address,
      utils.parseEther("10"),
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
      nonce,
      [tx],
      constants.AddressZero,
      constants.Zero,
      constants.AddressZero
    ).generateSigBySessionKey(sessionKeySigGenerator, SignType.EthSign);

    const ret = await (
      await txExecutor.execute(proxyModuleMain, { gasLimit: optimalGasLimit })
    ).wait();
    expect(ret.status).toEqual(1);
    expect(
      Number.parseInt(
        utils.formatEther(await provider.getBalance(to.address)),
        10
      )
    ).toEqual(10);
    nonce++;
  });
  it("Dkim Verify Should Success", async function () {
    const subject = constants.HashZero;
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
  it("Update TimeLock During Should Success", async () => {
    const newDelay = 3600;
    const masterKeySigGenerator = new MasterKeySigGenerator(
      masterKey,
      new RecoveryEmails(threshold, recoveryEmails)
    );
    const txBuilder = new UpdateTimeLockDuringTxBuilder(
      proxyModuleMain.address,
      metaNonce,
      newDelay
    );
    const subject = txBuilder.digestMessage();
    const tx = (
      await txBuilder.generateSigByMasterKeyWithDkimParams(
        masterKeySigGenerator,
        SignType.EthSign,
        await generateDkimParams(
          recoveryEmails,
          subject,
          [1, 2, 3, 4, 5],
          UnipassPrivateKey
        )
      )
    ).build();
    const ret = await (
      await new TxExcutor(
        chainId,
        nonce,
        [tx],
        constants.AddressZero,
        constants.Zero,
        constants.AddressZero
      )
        .generateSigBySigNone()
        .execute(proxyModuleMain, txParams)
    ).wait();

    expect(ret.status).toBe(1);
    expect(await proxyModuleMain.getLockDuring()).toEqual(
      BigNumber.from(newDelay)
    );
  });
  it("Unlock KeysetHash TimeLock Should Success", async () => {
    // Step 1: Update TimeLock During
    const newTimelockDuring = 3;
    const masterKeySigGenerator = new MasterKeySigGenerator(
      masterKey,
      new RecoveryEmails(threshold, recoveryEmails)
    );
    const txBuilder1 = new UpdateTimeLockDuringTxBuilder(
      proxyModuleMain.address,
      metaNonce,
      newTimelockDuring
    );
    const subject = txBuilder1.digestMessage();
    let tx = (
      await txBuilder1.generateSigByMasterKeyWithDkimParams(
        masterKeySigGenerator,
        SignType.EthSign,
        await generateDkimParams(
          recoveryEmails,
          subject,
          [1, 2, 3, 4, 5],
          UnipassPrivateKey
        )
      )
    ).build();
    let ret = await (
      await new TxExcutor(
        chainId,
        nonce,
        [tx],
        constants.AddressZero,
        constants.Zero,
        constants.AddressZero
      )
        .generateSigBySigNone()
        .execute(proxyModuleMain, txParams)
    ).wait();

    expect(ret.status).toBe(1);
    expect(await proxyModuleMain.getLockDuring()).toEqual(
      BigNumber.from(newTimelockDuring)
    );
    metaNonce++;
    nonce++;

    // Step 2: Update KeysetHash
    const newKeysetHash = Buffer.from(randomBytes(32));
    const txBuilder2 = new UpdateKeysetHashTxBuilder(
      proxyModuleMain.address,
      metaNonce,
      newKeysetHash
    );
    tx = (
      await txBuilder2.generateSigByMasterKey(
        masterKeySigGenerator,
        SignType.EthSign
      )
    ).build();
    let txExecutor = await new TxExcutor(
      chainId,
      nonce,
      [tx],
      constants.AddressZero,
      constants.Zero,
      constants.AddressZero
    ).generateSigByMasterKey(masterKeySigGenerator, SignType.EthSign);
    ret = await (
      await txExecutor.execute(proxyModuleMain, { gasLimit: optimalGasLimit })
    ).wait();
    expect(ret.status).toEqual(1);
    expect(await proxyModuleMain.lockedKeysetHash()).toEqual(
      `0x${newKeysetHash.toString("hex")}`
    );
    metaNonce++;
    nonce++;

    // Step3 Unlock TimeLock
    tx = new UnlockKeysetHashTxBuilder(proxyModuleMain.address, metaNonce)
      .generateSigBySignNone()
      .build();
    txExecutor = await new TxExcutor(
      chainId,
      nonce,
      [tx],
      constants.AddressZero,
      constants.Zero,
      constants.AddressZero
    ).generateSigBySigNone();
    try {
      await txExecutor.execute(proxyModuleMain, { gasLimit: optimalGasLimit });
    } catch (error) {
      expect(JSON.parse(error.body).error.message).toEqual(
        "Error: VM Exception while processing transaction: reverted with reason string 'ModuleTimeLock#requireUnLocked: UNLOCK_AFTER'"
      );
    }

    await new Promise((resolve) =>
      // eslint-disable-next-line no-promise-executor-return
      setTimeout(resolve, newTimelockDuring * 1000 + 1000)
    );

    ret = await (
      await txExecutor.execute(proxyModuleMain, { gasLimit: optimalGasLimit })
    ).wait();
    expect(ret.status).toEqual(1);
    expect(await proxyModuleMain.isLocked()).toBe(false);
    expect(await proxyModuleMain.getKeysetHash()).toEqual(
      hexlify(newKeysetHash)
    );
  });

  it("Unlock KeysetHash TimeLock Should Success", async () => {
    // Step 1: Update KeysetHash
    const newKeysetHash = Buffer.from(randomBytes(32));
    const txBuilder2 = new UpdateKeysetHashTxBuilder(
      proxyModuleMain.address,
      metaNonce,
      newKeysetHash
    );
    const masterKeySigGenerator = new MasterKeySigGenerator(
      masterKey,
      new RecoveryEmails(threshold, recoveryEmails)
    );
    let tx = (
      await txBuilder2.generateSigByMasterKey(
        masterKeySigGenerator,
        SignType.EthSign
      )
    ).build();
    let txExecutor = await new TxExcutor(
      chainId,
      nonce,
      [tx],
      constants.AddressZero,
      constants.Zero,
      constants.AddressZero
    ).generateSigByMasterKey(masterKeySigGenerator, SignType.EthSign);
    let ret = await (
      await txExecutor.execute(proxyModuleMain, { gasLimit: optimalGasLimit })
    ).wait();
    expect(ret.status).toEqual(1);
    expect(await proxyModuleMain.lockedKeysetHash()).toEqual(
      `0x${newKeysetHash.toString("hex")}`
    );
    metaNonce++;
    nonce++;

    // Step 2: Unlock TimeLock
    tx = (
      await new CancelLockKeysetHashTxBuilder(
        proxyModuleMain.address,
        metaNonce
      ).generateSigByMasterKey(masterKeySigGenerator, SignType.EthSign)
    ).build();
    txExecutor = await new TxExcutor(
      chainId,
      nonce,
      [tx],
      constants.AddressZero,
      constants.Zero,
      constants.AddressZero
    ).generateSigBySigNone();

    ret = await (
      await txExecutor.execute(proxyModuleMain, { gasLimit: optimalGasLimit })
    ).wait();
    expect(ret.status).toEqual(1);
    expect(await proxyModuleMain.isLocked()).toBe(false);
    expect(await proxyModuleMain.getKeysetHash()).toEqual(constants.HashZero);
  });

  it("Update Implemenation Should Success", async () => {
    const Greeter = new ContractFactory(
      new Interface(GreeterArtifact.abi),
      GreeterArtifact.bytecode
    );
    const greeter = await deployer.deployContract(Greeter, 0, txParams);

    const masterKeySigGenerator = new MasterKeySigGenerator(
      masterKey,
      new RecoveryEmails(threshold, recoveryEmails)
    );

    const txBuilder = new UpdateImplementationTxBuilder(
      proxyModuleMain.address,
      metaNonce,
      greeter.address
    );

    const tx = (
      await txBuilder.generateSigByMasterKeyWithDkimParams(
        masterKeySigGenerator,
        SignType.EthSign,
        await generateDkimParams(
          recoveryEmails,
          txBuilder.digestMessage(),
          [1, 2, 3, 4, 5],
          UnipassPrivateKey
        )
      )
    ).build();
    const txExecutor = await new TxExcutor(
      chainId,
      nonce,
      [tx],
      constants.AddressZero,
      constants.Zero,
      constants.AddressZero
    ).generateSigByMasterKey(masterKeySigGenerator, SignType.EthSign);
    const ret = await (
      await txExecutor.execute(proxyModuleMain, { gasLimit: optimalGasLimit })
    ).wait();
    expect(ret.status).toEqual(1);
    proxyModuleMain = greeter.attach(proxyModuleMain.address);
    expect(await proxyModuleMain.ret1()).toEqual(BigNumber.from(1));
    metaNonce++;
    nonce++;
  });
});
