# pxg-js

A convenient JS library for interacting with PXG.eth ENS names.

## What are PXG.eth names?

PXG.eth names are extended ENS names which include functionality supporting verified NFT avatars. This means that you can set one of your owned NFTs as a decentralized avatar which can be pulled in by any platform on the internet that connects to your web3 wallet.

PXG.eth names also include a free NFT profile which integrates your default avatar. You can register a PXG.eth name at [pxg.wtf](https://pxg.wtf).

## Installation

**Do this first**

You will need to install `web3` as a peer dependency within your project.

```
yarn add web3@^1.5.2
```

Then you can install pxg-js

```
yarn add pxg-js
```

## Setting up

### Basic set up

By default the PXG JS library will try to use the Ethereum client connected to the users web browser (ie MetaMask). Here's what a basic set up might look like within your app.

```js
import PxgLib from "pxg-js";

export const pxgLib = new PxgLib({
  network: "live",
});

if (pxgLib.hasProvider) {
  pxgLib.enable().then(() => {
    // Wallet connected
  });
} else {
  // Install metamask
}
```

### Advanced set up

**Using a modified version of Web3**

Sometimes you may want to use a modified version of web3, such as `alchemy-web3`. You can do this by utilizing the `initWeb3` function. You can also specify the `initAccounts` function which can be used to modify the default method of accessing the connected ETH wallet. It may look something like this:

```js
import { createAlchemyWeb3 } from "@alch/alchemy-web3";

import PxgLib from "pxg-js";

const initWeb3 = (provider) =>
  createAlchemyWeb3(ALCHEMY_URL, { writeProvider: provider });

export const pxgLib = new PxgLib({
  initWeb3,
  initAccounts: () => window?.ethereum.enable(),
  network: "live",
});
```

The `initWeb3` function will receive a `provider` as an argument. This will default to the Ethereum provider found in the browser (MetaMask), if one is available.

**Usage in a Node environment**

You can use PXG JS within a Node environment. You will need utilize `initAccounts` and `initWeb3` functions. Here is an example of how you can do it:

```js
import PxgLib from "pxg-js";
import Web3 from "web3";

export function getHttpProvider() {
  return new Web3(new Web3.providers.HttpProvider(process.env.HTTP_URI));
}

const pxgLib = new PxgLib({
  network: "live",
  initAccounts: async () => [],
  initWeb3: () => getHttpProvider(),
  provider: getHttpProvider(),
});

pxgLib._setWeb3();

// Library is ready to use :)
const owner = await pxgLib.ownerOfNode("nftboi");
```

## API

### Class: PxgLib

Creating a new instance of the PxgLib class will allow you to use the library. It extends the Web3Util class.

```js
import PxgLib from "pxg-js";

export const pxgLib = new PxgLib({
  network: "live",
});
```

The PxgLib class takes one argument which is an `Object` that has the following properties:

- `network` - Required. One of the following strings: `live` or `rinkeby`.
- `initWeb3` - Optional. A function that returns an initialized instance of `Web3`. The first argument is the `provider` passed in, or found from the browser.
- `provider` - Optional. A web3 provider.
- `initAccounts` - Optional. A function which returns an array of connected accounts.

### pxgLib.hasProvider

A boolean which states if the current instance has an available provider. If `false` that means the user should install a wallet like MetaMask.

### pxgLib.enable

A function which enables Web3 and connects the current users wallet. Before calling this function you should check that `pxgLib.hasProvider` is true.

```js
const enable = async () => {
  try {
    await pxgLib.enable();
  } catch {
    // User denied connection request.
  }
};
```

### pxgLib.getContract

A function that returns an initialized Web3 Contract instance. This function takes one argument which is the name of the contract. Valid names are

- `glyphs` - String. Will return the Pixelglyph NFT smart contract.
- `registrar` - String. Will return the PXG.eth registrar smart contract.
- `resolver` - String. Will return the PXG.eth resolver smart contract.

```js
const contract = pxgLib.getContract("registrar");
```

### pxgLib.getGlyphs

An async function that will return a list of all the Pixelglyphs the current connected wallet owns.

Returns a list of objects that contain the following information:

```ts
{
  name: string;
  image: string;
  tokenId: string;
}
```

### pxg.balanceOf

An async function which returns the number of PXG.eth names the current connected address owns.

### pxgLib.tokenOfOwnerByIndex

An async function that returns information about an owned PXG.eth domain at a specified index. This function takes two arguments:

- `index` - Number. The index of the token.
- `address` - String. The address of the owner. Defaults to the current connected address.

If you are familiar with the ERC-721 spec this method will look familiar to you. The difference is this method will return details about the given token ID:

```ts
{
  tokenId: string;
  label: string; // example 'nftboi.pxg.eth'
  name: string; // example 'nftboi'
}
```

### pxgLib.ownerOfNode

An async function that returns the current owner of a given PXG.eth name. This function takes one argument, a string which is the name of the PXG.eth domain.

```js
const owner = await pxgLib.ownerOfNode("nftboi");
```

### pxgLib.claimFromGlyph

An async function that allows a wallet to claim a PXG.eth name using a Pixelglyph they own. This function takes two arguments:

- `glyphId` - String. The token ID of an unclaimed Pixelglyph NFT.
- `input` - String. The requested PXG.eth name

### pxgLib.setDefaultAvatar

An async function that can be used to set an NFT avatar for a given name. This function takes three arguments:

- `subdomain` - String. The PXG.eth subdomain.
- `collectionAddress` - String. The contract address of the NFT smart contract containing the NFT to be used as an avatar.
- `tokenId` - String or Number. The token ID of the NFT to be used as an avatar.

```js
await pxgLib.setDefaultAvatar("nftboi", CRYPTO_PUNK_ADDRESS, "259");
```

### pxgLib.getDefaultAvatar

An async function that will return information about the NFT avatar for a given name. This function takes on argument, a string which is the PXG.eth subdomain.

### pxgLib.getDefaultAvatarByWalletAddress

An async function which can be used to get a default NFT avatar by wallet address. This method will look up the ENS reverse record, verify if it is a PXG.eth name, and then check if a default avatar has been set.

This function takes on argument, a string which is the users wallet address.

This function returns an object containing information about the default avatar. If no avatar is set the address property will contain a zero address.

```js
const avatar = await pxgLib.getDefaultAvatarByWalletAddress(MY_WALLET_ADDRESS);
```

The object returned will look like this:

```js
{
  // The NFT smart contract address. May be empty address if not set
  // pxgLib.constants.ZERO_ADDRESS can be used to check
  address: string;
  // Token ID of NFT.
  tokenId: string;
  // The metadata object containing information about the NFT
  metadata: {
  }
}
```
