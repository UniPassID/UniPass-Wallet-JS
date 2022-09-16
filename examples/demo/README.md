# UnipassWalletProvider

## Init

```typescript
// init provider
type ChainName =
  | "polygon-mainnet"
  | "bsc-mainnet"
  | "rangers-mainnet"
  | "polygon-mumbai"
  | "bsc-testnet"
  | "rangers-robin";

type Environment = "dev" | "test" | "prod";

const provider = UnipassWalletProvider.getInstance({ chainName: "polygon-mumbai", env: "dev" });
```

## Register

```typescript
// 1. send verify code to email
await unipassWallet.registerCode(email);
// 2. verify code from email box
await unipassWallet.verifyRegisterCode(code);
// 3. pass password to register
await unipassWallet.register(password);
```

## Login

```typescript
// 1. check password
await unipassWallet.passwordToken(email, password);
// 2. send verify code to email
await unipassWallet.loginCode(email);
// 2. pass password to register
await unipassWallet.login(code);
```

## isLoggedIn

```typescript
// Check if local user information is valid, if not valid, you need register or login again
const isLoggedIn = await unipassWallet.isLoggedIn()
```

## logout

```typescript
// logout will clear local user info
await unipassWallet.logout()
```

## transaction
```typescript
// send transaction
// tx is UniTransaction interface, if not pass chainName, the default value is chainName when you init unipassWallet
interface UniTransaction {
  revertOnError?: boolean;
  gasLimit?: BigNumber;
  target: BytesLike;
  value: BigNumber;
  data?: BytesLike;
}

await unipassWallet.transaction(tx, chainName)
```