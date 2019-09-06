import {
  ITransaction,
  KeyPair,
  NewBlockMessage,
  KeyPairsIndexer,
  BlockAndVotes,
  IState,
} from '../../packages/interfaces';
import { TransactionPool } from '../utils/transaction-pool';
import { LimitCache } from '../../packages/utils/limit-cache';
import * as LRU from 'lru-cache';
import { copyObject } from '../base/helpers';

export class StateHelper {
  // state management
  public static getInitialState() {
    const state: IState = {
      // TODO: check correct init values
      votesKeySet: {},
      pendingBlock: undefined,
      pendingVotes: undefined,

      lastBlock: undefined,
      blockCache: {},

      proposeCache: {},
      lastPropose: null,
      privIsCollectingVotes: false,
      lastVoteTime: undefined,
    };

    return state;
  }

  public static setState(state: IState) {
    global.state = state;
  }

  /**
   * returns always a deepCopy of the current state
   */
  public static getState() {
    const state = StateHelper.copyState(global.state);
    return state;
  }

  public static copyState(state: IState) {
    return copyObject(state);
  }

  // keyPairs
  public static getInitialKeyPairs() {
    return {} as KeyPairsIndexer;
  }
  public static SetKeyPairs(keyPairs: KeyPairsIndexer) {
    global.keyPairs = keyPairs;
  }
  public static GetKeyPairs() {
    return global.keyPairs;
  }
  public static isPublicKeyInKeyPairs(publicKey: string) {
    if (global.keyPairs[publicKey]) {
      return true;
    } else {
      return false;
    }
  }
  public static setKeyPair(publicKey: string, keys: KeyPair) {
    global.keyPairs[publicKey] = keys;
  }
  public static removeKeyPair(publicKey: string) {
    delete global.keyPairs[publicKey];
  }

  // isForgingEnabled
  public static IsForgingEnabled() {
    return global.isForgingEnabled;
  }
  public static SetForgingEnabled(newStatus: boolean) {
    global.isForgingEnabled = newStatus;
  }

  // privSyncing
  public static IsSyncing() {
    return global.privSyncing;
  }
  public static SetIsSyncing(newState: boolean) {
    global.privSyncing = newState;
  }

  // blocksToSync
  public static SetBlocksToSync(height: number) {
    global.blocksToSync = height;
  }
  public static GetBlocksToSync() {
    return global.blocksToSync;
  }

  // Transaction Pool
  public static InitializeTransactionPool() {
    global.transactionPool = new TransactionPool();
  }
  public static GetUnconfirmedTransaction(id: string) {
    return global.transactionPool.get(id);
  }
  public static GetUnconfirmedTransactionList() {
    return global.transactionPool.getUnconfirmed();
  }
  public static TrsAlreadyInUnconfirmedPool(id: string) {
    return global.transactionPool.has(id);
  }
  public static ClearUnconfirmedTransactions() {
    global.transactionPool.clear();
  }
  public static AddUnconfirmedTransactions(transaction: ITransaction) {
    global.transactionPool.add(transaction);
  }

  // failedTrsCache
  public static InitializeFailedTrsCache() {
    global.failedTrsCache = new LimitCache<string, boolean>();
  }
  public static TrsAlreadyFailed(key: string) {
    return global.failedTrsCache.has(key);
  }
  public static AddFailedTrs(key: string) {
    global.failedTrsCache.set(key, true);
  }

  // allModulesLoaded (new)
  public static InitializeModulesAreLoaded() {
    global.areAllModulesLoaded = false;
  }
  public static ModulesAreLoaded() {
    return global.areAllModulesLoaded;
  }
  public static SetAllModulesLoaded(newVal: boolean) {
    global.areAllModulesLoaded = newVal;
  }

  // blockchainReady (new)
  public static InitializeBlockchainReady() {
    global.blockchainReady = false;
  }
  public static BlockchainReady() {
    return global.blockchainReady;
  }
  public static SetBlockchainReady(newVal: boolean) {
    global.blockchainReady = newVal;
  }

  // latestBlocksCache
  public static InitializeLatestBlockCache() {
    global.latestBlocksCache = new LRU<string, BlockAndVotes>(200);
  }
  public static SetBlockToLatestBlockCache(
    blockId: string,
    blockAndVotes: BlockAndVotes
  ) {
    global.latestBlocksCache.set(blockId, blockAndVotes);
  }
  public static GetBlockFromLatestBlockCache(blockId: string) {
    return global.latestBlocksCache.get(blockId);
  }

  // blockHeaderMidCache
  public static InitializeBlockHeaderMidCache() {
    global.blockHeaderMidCache = new LRU<string, NewBlockMessage>(1000);
  }
  public static SetBlockHeaderMidCache(
    blockId: string,
    newBlockMsg: NewBlockMessage
  ) {
    global.blockHeaderMidCache.set(blockId, newBlockMsg);
  }
  public static GetBlockHeaderMidCache(blockId: string) {
    return global.blockHeaderMidCache.get(blockId);
  }
}
