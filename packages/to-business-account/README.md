# To Business Account SDK

## Install

```bash
npm install @unipasswallet/to-business-account
```

## How to use

```typescript
let account = await UnipassToBusinessAccount.connectFromStorage(storage);
if (!account) {
  account = await UnipassToBusinessAccount.connect(options);
}

// Connect By OAuth
const options = {
  connectParams: {
    idToken,
    accessToken,
    unipassServerUrl,
    source,
  },
  storage: UnipassToBusinessStorage;
  appId: string;
  rpcUrl: string;
};

// Connect By Signer
const options = {
  connectParams: {
    signer,
  },
  storage: UnipassToBusinessStorage;
  appId: string;
  rpcUrl: string;
};
```
