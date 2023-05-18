# To Business Account SDK

## Install

```bash
npm install @unipasswallet/smart-account
```

## How to use

### Generate Master Key Signer

`Master Key Signer` is the main signer for signing messages and transactions.

It has to inherit the `Signer` in `ethers.js`.

#### Web3Auth Signer

```typescript
import { Web3AuthSigner } from "@unipasswallet/smart-account-signer";

let signer = new Web3AuthSigner({
  appId,
  idToken,
});

signer = await signer.init();
```

### Generate Smart Account

```typescript
import { SmartAccount } from "@unipasswallet/smart-account";
const smartAccount = new SmartAccount({
  rpcUrl: "https://rpc.ankr.com/eth_goerli",
  masterKeySigner: signer,
  appId,
});

await smartAccount.init();
```
