import { Web3Util } from "./web3.util";
import abi from "./contracts/glyphs.json";
import resolverAbi from "./contracts/resolver.json";
import registrarAbi from "./contracts/registrar.json";
import isURL from "validator/lib/isURL";
// @ts-ignore
import ENS, { getEnsAddress } from "@ensdomains/ensjs";

// @ts-ignore
import namehash from "eth-ens-namehash";
import {
  AvatarType,
  ContractTypes,
  Links,
  Metadata,
  TokenInfo,
  Web3UtilParams,
} from "./types";

export * from "./types";
export * from "./web3.util";

const CONTRACTS = {
  local: {
    resolver: "0x6BcB3aC8641a9535888299EdE7D15EC3aE9e7071",
    registrar: "0x70890aFeC0E5758A729787Eb08c981151C33A228",
    glyphs: "0xc82BA0a9eDCD3DBf23AF7974F155720C50ac6eaF",
  },
  rinkeby: {
    resolver: "0x066134888FC6eb1AD0A8fe7C22402dB9b0E408d9",
    registrar: "0xB454A2d8Fca4FfA3747E8c90bE99d865cb44F98c",
    glyphs: "0x7605F0BbbFfc6A12Fb5a9b969Fb969f36AE6d777",
  },
  live: {
    resolver: "0x1B6056F4542508ff9e9B083bf0eCd79aA2418755",
    registrar: "0x790cA7577EFCa88DAD9ba8EB3865e45b4cE4C7e9",
    glyphs: "0xf38d6bf300d52ba7880b43cddb3f94ee3c6c4ea6",
  },
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const ABI = {
  glyphs: abi,
  registrar: registrarAbi,
  resolver: resolverAbi,
};

const REQUEST_URL = {
  local: "http://localhost:3000",
  rinkeby: "https://pxg-dev.herokuapp.com",
  live: "https://pxg-prod.herokuapp.com",
};

const NODES = {
  local: "pxg.eth",
  rinkeby: "pxgtester.test",
  live: "pxg.eth",
};

export type Network = keyof typeof REQUEST_URL;

export default class PxgLib extends Web3Util {
  network: Network;
  contracts: ContractTypes;
  requestUrl: string;
  ens?: any;

  constants = {
    ZERO_ADDRESS,
    PUNK_ADDRESS: "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB",
    NODE: "",
  };

  constructor(options?: { network?: Network } & Web3UtilParams) {
    super(options);
    this.network = options?.network ?? "local";
    this.requestUrl = REQUEST_URL[this.network];
    this.constants.NODE = NODES[this.network];
    switch (this.network) {
      case "local":
        this.contracts = CONTRACTS.local;
        break;
      case "rinkeby":
        this.contracts = CONTRACTS.rinkeby;
        break;
      case "live":
        this.contracts = CONTRACTS.live;
        break;
      default:
        throw new Error("Should have network set");
    }
  }

  private err(msg?: string) {
    throw new Error(`PXG LIB: ${msg ?? ""}`);
  }

  // Gets an initialized web3 contract class
  getContract(name: keyof ContractTypes) {
    if (!this.web3) return this.err("Web3 not defined");
    return new this.web3.eth.Contract(ABI[name] as any, this.contracts[name]);
  }

  // Gets all owned Pixelglyphs for the current active address
  async getGlyphs() {
    if (!this.web3) return this.err("Web3 not defined");
    if (!this.accounts?.[0]) return this.err("Accounts not available");

    const contract = this.getContract("glyphs");
    if (!contract) throw new Error();
    let balance = await contract.methods.balanceOf(this.accounts[0]).call();
    balance = parseInt(balance);
    const p = [];
    for (let i = 0; i < balance; i++) {
      const [account] = this.accounts;
      const fn: () => Promise<Metadata> = async () => {
        const tokenId = await contract.methods
          .tokenOfOwnerByIndex(account, i)
          .call();
        const metadata = await fetch(
          `${REQUEST_URL}/metadata/${tokenId.toString()}`
        ).then((res) => {
          return res.json();
        });
        return metadata as unknown as Metadata;
      };
      p.push(fn());
    }

    return Promise.all(p);
  }

  // Gets the balance of PXG.eth domains a specified address owns
  balanceOf(address: string = this.accounts?.[0] ?? "") {
    const contract = this.getContract("registrar");
    if (!contract) throw new Error();
    return contract.methods.balanceOf(address).call();
  }

  // Returns information about an owned PXG.eth domain at a specified index
  async tokenOfOwnerByIndex(
    idx: number,
    address: string = this.accounts?.[0] ?? ""
  ): Promise<TokenInfo> {
    const contract = this.getContract("registrar");
    if (!contract) throw new Error();
    const token = await contract.methods
      .tokenOfOwnerByIndex(address, idx)
      .call();
    const label = await contract.methods
      .nodeToLabel(
        this.web3?.utils.padLeft(this.web3?.utils.numberToHex(token), 64)
      )
      .call();
    return {
      tokenId: token,
      label: `${label}.${this.constants.NODE}`,
      name: label,
    };
  }

  // Returns the current owner of a given PXG.eth domain
  ownerOfNode(label: string): string {
    const contract = this.getContract("registrar");
    if (!contract) throw new Error();
    return contract.methods.getOwnerFromNode(this.getNode(label)).call();
  }

  private getNode(subdomain: string) {
    return namehash.hash(
      namehash.normalize(`${subdomain}.${this.constants.NODE}`)
    );
  }

  // Allows a user to claim a PXG.eth domain using the specified Pixelglyph ID
  // input should be validated prior to using this function
  claimFromGlyph(glyphId: string, input: string) {
    const contract = this.getContract("registrar");
    if (!contract) throw new Error();
    return contract.methods
      .claimGlyph(input, glyphId)
      .send({ from: this.accounts?.[0] });
  }

  // Sets a default avatar for a given PXG.eth domain
  // collection must be supported by the registrar contract
  setDefaultAvatar(
    subdomain: string,
    collectionAddress: string,
    tokenId: string | number
  ) {
    const contract = this.getContract("resolver");
    if (!contract) throw new Error();
    return contract.methods
      .setDefaultAvatar(this.getNode(subdomain), collectionAddress, tokenId)
      .send({ from: this.accounts?.[0] });
  }

  // Gets the default avatar for a given PXG.eth domain
  // Will return address(0) if none is set.
  async getDefaultAvatar(subdomain: string): Promise<AvatarType> {
    const contract = this.getContract("resolver");
    if (!contract) throw new Error();
    const { 0: address, 1: tokenId } = await contract.methods
      .getDefaultAvatar(this.getNode(subdomain))
      .call();

    if (address === this.constants.ZERO_ADDRESS) {
      return {
        address,
        tokenId,
        metadata: {},
      };
    }
    if (!this.web3) throw new Error();

    if (address === this.constants.PUNK_ADDRESS) {
      return {
        tokenId,
        address,
        metadata: {
          name: `CryptoPunk ${tokenId}`,
          image: `https://larvalabs.com/public/images/cryptopunks/punk${String(
            tokenId
          ).padStart(4, "0")}.png`,
        },
      };
    }

    const nftContract = new this.web3.eth.Contract(abi as any, address);

    const tokenUri = await nftContract.methods.tokenURI(tokenId).call();

    let metadata = {};

    if (tokenUri) {
      metadata = await fetch(normalizeIpfs(tokenUri)).then((res) => res.json());
    }

    return {
      tokenId,
      address,
      metadata,
    };
  }

  async getDefaultAvatarByWalletAddress(address: string): Promise<AvatarType> {
    if (!this.ens) {
      // @ts-ignore
      this.ens = new ENS({
        provider: this.provider,
        ensAddress: getEnsAddress("1"),
      });
    }

    let { name } = await this.ens.getName(this?.accounts?.[0]);

    if (name && name.toLowerCase().endsWith(".pxg.eth")) {
      name = name.substring(0, name.length - 8);
      return this.getDefaultAvatar(name);
    } else {
      return {
        address: this.constants.ZERO_ADDRESS,
        tokenId: "",
        metadata: {},
      };
    }
  }

  // Sets links for a given subdomain. User required to sign message proving ownership.
  async setLinks(label: string, links: Links) {
    const values = Object.values(links);

    if (
      !values.every(
        (item) => isURL(item, { require_protocol: false }) || item === ""
      )
    ) {
      throw new Error("invalid url");
    }
    const timestamp = await fetch(`${this.requestUrl}/timestamp`).then(
      (res) => {
        return res.text();
      }
    );
    const message = `To confirm ownership of this address, please sign this message.\n\nTimestamp: ${timestamp}`;
    const signature = await this.signMessage(message);
    return fetch(`${this.requestUrl}/set-links`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timestamp,
        signature,
        links,
        label,
      }),
    });
  }

  // Gets links for a given subdomain
  getLinks(label: string) {
    return fetch(`${this.requestUrl}/get-links/${label}`).then((res) =>
      res.json()
    );
  }

  // Sets a default Cyber gallery
  async setDefaultGallery(label: string, exhibitId: string) {
    const timestamp = await fetch(`${this.requestUrl}/timestamp`).then(
      (res) => {
        return res.text();
      }
    );
    const message = `To confirm ownership of this address, please sign this message.\n\nTimestamp: ${timestamp}`;
    const signature = await this.signMessage(message);
    return fetch(`${this.requestUrl}/set-gallery`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timestamp,
        signature,
        exhibitId,
        label,
      }),
    });
  }

  // Gets the default Cyber gallery for a subdomain
  async getDefaultGallery(label: string) {
    return fetch(`${this.requestUrl}/get-gallery/${label}`).then((res) =>
      res.json()
    );
  }

  private signMessage(signingMessage: string) {
    return new Promise((resolve, reject) => {
      if (!this.web3 || !this.accounts?.[0]) return;
      this.web3.eth.personal.sign(
        signingMessage,
        this.accounts[0],
        // @ts-ignore
        (err: Error, result: any) => {
          if (err) return reject(new Error(err.message));
          if (result.error) {
            return reject(new Error(result.error.message));
          }
          resolve(result);
        }
      );
    });
  }
}

export function normalizeIpfs(str: string) {
  return str.replace("ipfs://", "https://ipfs.infura.io/ipfs/");
}
