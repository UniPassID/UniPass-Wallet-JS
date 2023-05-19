# Smart Account SDK

## Install

```bash
npm install @unipasswallet/smart-account
```

## Smart Account

### Step1: Master Key Signer

Master Key Signer is the main signer for signing messages and transactions. It has to inherit the `Signer` in `ethers.js`.

**Init Signer from `idToken`**

If you want to use signers from UniPass, also need to run this command:

```tsx
npm install @unipasswallet/smart-account-signer
```

```tsx
import { UniPassJwtSigner } from "@unipasswallet/smart-account-signer";

let signer = new UniPassJwtSigner({
  appId, // The App Identity registered in UniPass server.
  idToken, // The id token from the Oauth service registered in the UniPass server.
});

signer = await signer.init();
```

**Init Signer from `MeatMask`**

```tsx
const provider = new ethers.providers.Web3Provider(window.ethereum);

// Prompt user for account connections
await provider.send("eth_requestAccounts", []);

const signer = provider.getSigner();
```

### Step2 : Smart Account

```tsx
import { SmartAccount } from "@unipasswallet/smart-account";

const smartAccount = new SmartAccount({
  rpcUrl: "https://rpc.ankr.com/eth_goerli",
  masterKeySigner: signer,
  appId,
});

await smartAccount.init();
```

## Methods of `SmartAccount`

The instance of `SmartAccount` returns the following functions:

- Get Smart Account Info
  - `getAddress()` : returns the address of your smart account.
  - `isDeployed()` : returns the result whether your smart account is deployed in current chain.
  - `getProvider()`: returns current provider that your smart account is using.
  - `getChainId()`: returns current chain id of your smart account.
  - `switchChain()`: (developing)
- `sendTransaction()`: (developing)
- `sendBatchTransaction()`: (developing)

## Get Smart Account Info (Finished)

`getAddress()`

This returns the address of your smart account.

```tsx
const address = await smartAccount.getAddress();
```

`isDeployed()`

This returns the result whether your smart account is deployed in current chain.

```tsx
const isDeployed = await smartAccount.isDeployed();
```

`getProvider()`

This returns current provider that your smart account is using.

```tsx
const provider = smartAccount.getProvider();
```

`getChainId()`

This returns current chain of your smart account.

```tsx
const chainId = await smartAccount.getChainId();
```
