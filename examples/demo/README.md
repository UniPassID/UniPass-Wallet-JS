# UnipassWalletProvider

## Init

```typescript
// init provider
type Environment = "dev" | "test" | "testnet" | "mainnet";

const provider = UnipassWalletProvider.getInstance({ env: "dev" });
```

## Register

```typescript
// 1. send verify code to email
await unipassWallet.registerCode(email);
// 2. verify code from email
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

## IsLoggedIn

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

// send native token
await unipassWallet.transaction({
  tx: {
    target: "0x1234..",
    value: etherToWei("0.1"),
  }, fee: {
    token: erc20TokenContractAddress,
    value: etherToWei("0.001"),
  }, "polygon"})

// send erc20 token
const erc20Interface = new ethers.utils.Interface(["function transfer(address _to, uint256 _value)"]);
const erc20TokenData = erc20Interface.encodeFunctionData("transfer", [erc20TokenAddress, etherToWei(tokenValue)]);
await unipassWallet.transaction({
  tx: {
    target: "0x1234..",
    value: etherToWei("0"),
    revertOnError: true,
    data: erc20TokenData
  }, fee: {
    token: erc20TokenContractAddress,
    value: etherToWei("0.001"),
  }, "polygon"})
```

## Sign message
```typescript
// sign mseeage
const signature = await unipassWallet.signMessage()
```

## Verify message
```typescript
// verify mseeage
const isValid = await unipassWallet.verifySignMessage(values.message, values.signature);
```

## Get wallet instance

```typescript
// get the wallet instance, extend ethers.Signer
const polygonWallet = await unipassWallet.wallet("polygon");
const bscWallet = await unipassWallet.wallet("bsc");
const rangersWallet = await unipassWallet.wallet("rangers");

const polygonBalance = await polygonWallet?.getBalance();
const bscBalance = await bscWallet?.getBalance();
const rangersBalance = await rangersWallet?.getBalance();
```