# Unipass-Wallet.js

## Install

```typescript
npm i unipass-wallet
```

## Packages

```text
 --- packages
|
|------ abi
|
|------ unipass-wallet-dkim
|
 ------ unipass-wallet
```

## Build Transaction

```typescript

# Build Tx With Master Key
const tx = (
  await txBuilder.generateSigByMasterKey(
    masterKeySigGenerator,
    SignType.EthSign
  )
).build();

# Build Tx With Master Key And Recovery Email
const tx = (
  await txBuilder.generateSigByMasterKeyWithDkimParams(
    masterKeySigGenerator,
    SignType.EthSign,
    dkimParams
  )
).build();

# Build Tx With Reocovery Email
const tx = (
  await txBuilder.generateSigByRecoveryEmails(
    recoveryEmailsSigGenerator,
    dkimParams
  )
).build();
```

## Tx Executor

```typescript
const txExecutor = await new TxExcutor(
  chainId,
  1,
  [tx],
  ethers.constants.AddressZero,
  ethers.constants.Zero,
  ethers.constants.AddressZero
).generateSigBySessionKey(sessionKeySigGenerator, SignType.EthSign);

# Tx Execute
const ret = await (
  await txExecutor.execute(proxyModuleMain, optimalGasLimit)
).wait();
```

## Notice

- lerna verstion has to be 0.0.4
