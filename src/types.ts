import Web3 from "web3";

export type AvatarType = {
  address: string;
  tokenId: string;
  metadata: any;
};

export type Links = {
  opensea: string;
  makersplace: string;
  knownorigin: string;
  foundation: string;
  rarible: string;
  superrare: string;
  cargo: string;

  twitter: string;
  instagram: string;
  discord: string;
  telegram: string;
};

export type ContractTypes = {
  resolver: string;
  registrar: string;
  glyphs: string;
};

export type Metadata = {
  name: string;
  image: string;
  tokenId: string;
};

export type TokenInfo = {
  tokenId: string;
  label: string;
  name: string;
};

export type InitWeb3Fn = (() => Web3) | (<T>() => Web3 & T);
export type InitAccountsFn = () => Promise<string[]>;
