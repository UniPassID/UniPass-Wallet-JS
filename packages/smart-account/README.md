# To Business Account SDK

## Install

```bash
npm install @unipasswallet/smart-account
```

## How to use

### Generate Master Key Signer

`Master Key Signer` is the main signer for signing messages and transactions.

It has to inherit the `Signer` in `ethers.js`.

#### Mpc Signer

```typescript
import { LocalStorage, MpcSigner } from "@unipasswallet/smart-account";

const signer = new MpcSigner({
  storage: LocalMpcStorage,
});

// If initalized by reading from storage.
await signer.init();

// If initalized by id token.
await signer.init({
  idToken,
  noStorage: true,
  appId,
});
```

### Generate Smart Account

```typescript
import { SmartAccount } from "@unipasswallet/smart-account";
const smartAccount = new SmartAccount({
  rpcUrl: "https://node.wallet.unipass.id/eth-mainnet",
  masterKeySigner: signer,
});

await smartAccount.init();
```
