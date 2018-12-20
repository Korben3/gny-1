
import server from './core/server'
import accounts from './core/accounts'
import transactions from './core/transactions'
import loader from './core/loader'
import system from './core/system'
import peer from './core/peer'
import transport from './core/transport'
import delegates from './core/delegates'
import round from './core/round'
import uia from './core/uia'
import blocks from './core/blocks'

import { Consensus as BaseConsensus } from './base/consensus'
import { Transaction as BaseTransaction } from './base/transaction'
import { Block as BaseBlock } from './base/block'

import { Protobuf } from './utils/protobuf'
import * as tracer from 'tracer'
import * as zSchema from 'z-schema'

import Sequence from './utils/sequence'
import { EventEmitter } from 'events';

// IServer import
import * as express from 'express'
import { Server } from 'http'
import * as SocketIO from 'socket.io'

// IApp
import { AschCore } from 'asch-smartdb';
import BalanceManager from './smartdb/balance-manager'
import AutoIncrement from './smartdb/auto-increment'
import * as bignumber from 'bignumber'

declare interface IBase {
  bus: any;
  scheme: zSchema;
  genesisBlock: IGenesisBlock;
  consensus: BaseConsensus;
  transaction: BaseTransaction;
  block: BaseBlock;
}

export interface IScope {
  protobuf: Protobuf;
  config: any;
  logger: ILogger;
  genesisBlock: IGenesisBlock;
  scheme: zSchema;
  network: INetwork;
  dbSequence: Sequence;
  sequence: Sequence;
  balancesSequence: Sequence;
  base: IBase;
  bus: EventEmitter & IMessageEmitter;
  modules: Modules;
}

export interface Modules {
  server: server;
  accounts: accounts;
  transactions: transactions;
  loader: loader;
  system: system;
  peer: peer;
  transport: transport;
  delegates: delegates;
  round: round;
  uia: uia;
  blocks: blocks;
}


export interface IMessageEmitter {
  message: (topic: string, ...restArgs: any[]) => void
}

export interface INetwork {
  express: typeof express
  app: express.Application;
  server: Server;
  io: SocketIO.Server;
  sslServer?: Server;
  sslio?: SocketIO.Server;
}

interface IUtil {
  address: any;
  bignumber: bignumber;
  transactionMode: any;
}

interface IValidatorConstraints {
  length?: number;
  isEmail?: boolean;
  url?: boolean;
  number?: boolean;
}

interface IValidators {
  amount: (amount: any) => string;
  name: (amount: any) => string;
  publickey: (value: any) => string;
  string: (value: any, constraints: IValidatorConstraints) => any;
}

type ICurrency = string
type IFee = string

interface ICurrencyFee {
  currency: ICurrency;
  min: IFee;
}

interface IApp {
  sdb: AschCore.SmartDB;
  balances: BalanceManager;
  autoID: AutoIncrement;
  events: EventEmitter;
  util: IUtil;
  validators: IValidators;
  validate: (type: string, value: any, constraints?: IValidatorConstraints) => void | never;
  registerContract: (type: number, name: string) => void;
  getContractName: (type: string) => any;
  contractTypeMapping: {
    [type: string]: string;
  };
  contract: {
    [name: string]: any;
  }
  registerFee: (type: number, min: string, currency: string) => void;
  defaultFee: ICurrencyFee;
  feeMapping: {
    [type: string]: ICurrencyFee;
  };
  getFee: (type: string) => ICurrencyFee;
  setDefaultFee: (min: string, currency: string) => void;
  addRoundFee: (fee: IFee, roundNumber: number) => void;
  getRealTime: (epochTime: number) => number;
  hooks: {
    [name: string]: () => void
  };
  registerHook: (name: string, func: () => void) => void;
  isCurrentBookkeeper: (addr: string) => boolean;
  AccountRole: {
    DELEGATE: number;
    GATEWAY_VALIDATOR: number;
  };
  logger: ILogger;
}

export type ILogger = tracer.Tracer.Logger;

export interface IGenesisBlock {
  version: number;
  payloadHash: string;
  timestamp: number;
  previousBlock: null;
  delegate: string;
  height: number;
  count: number;
  fees: number;
  reward: number;
  signature: string;
  id: string;
  transactions: {
    type: number;
    fee: number;
    timestamp: number;
    senderid: string;
    senderPublicKey: string;
    signatures: string[];
    message: string;
    args: any[];
    id: string;
  }[];
}


type ILogLevel = "trace" | "debug" | "log" | "info" | "warn" | "error" | "fatal"


export interface IConfig {
  version: string;
  magic: string;
  baseDir: string;
  dataDir: string;
  appDir: string;
  buildVersion: string;
  netVersion: string;
  publicDir: string;
  port: number;
  peerPort: number;
  address: string;
  peers: {
    list: { ip: string, port: string | number }[];
  };
  logLevel: ILogLevel;
  pidFile: string;
}

export interface KeyPairsIndexer {
  [publicKey: string]: KeyPair;
}

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export interface ManyVotes {
  height: number;
  id: string;
  signatures: Signature[];
}

export interface Signature {
  publicKey: string;
  signature: string;
}

export interface ISimpleCache {
  [id: string]: boolean;
}

declare global {
  namespace NodeJS {
    interface Global {
      library: Partial<IScope>;
      modules: Modules;
      app: Partial<IApp>;
      Config: Partial<IConfig>;
    }
    interface Process {
      once(event: 'cleanup', listener: () => void): this;
      emit(event: 'cleanup'): this;
    }
  }
}

