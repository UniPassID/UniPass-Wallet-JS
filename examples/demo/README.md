# UnipassWalletProvider

## Init

```typescript
// init provider

type Environment = "dev" | "test" | "prod";

const provider = UnipassWalletProvider.getInstance({ env: "dev" });
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

interface TransactionFee {
  value: BigNumber;
  token: string;
}

interface TransactionProps {
  tx: UniTransaction;
  fee?: TransactionFee;
  chain?: ChainType;
}

const erc20Interface = new ethers.utils.Interface(["function transfer(address _to, uint256 _value)"]);
const erc20TokenData = erc20Interface.encodeFunctionData("transfer", [erc20TokenAddress, tokenValue]);
await unipassWallet.transaction({
  tx: {
    target: "0x1234..",
    value: etherToWei("1"),
    revertOnError: true,
    data: erc20TokenData
  }, fee: {
    token: "0x7890..",
    value: etherToWei("0.001"),
  }, "polygon"})
```


## Get account sync status
```typescript
// get the sync status of bsc chain or rangers chain
const status = await unipassWallet.isSynced("bsc")
const status = await unipassWallet.isSynced("rangers")
```
## Send sync email
```typescript
// when isSynced function return false, call this function to get an sync email
await unipassWallet.sendSyncEmail()
```
## Sign message

```typescript
// sign mseeage
await unipassWallet.signMessage()
```

## get wallet instance

```typescript
// get the wallet instance, extend ethers.Signer
const polygonWallet = await unipassWallet.wallet("polygon");
const bscWallet = await unipassWallet.wallet("bsc");
const rangersWallet = await unipassWallet.wallet("rangers");

const polygonBalance = await polygonWallet?.getBalance();
const bscBalance = await bscWallet?.getBalance();
const rangersBalance = await rangersWallet?.getBalance();
```