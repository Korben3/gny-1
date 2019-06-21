import {
  Transaction,
  KeyPair,
  IBlock,
  BlockPropose,
  IState,
  ISimpleCache,
  IConfig,
  NewBlockMessage,
  ILogger,
  KeyPairsIndexer,
} from '../interfaces';
import { TransactionPool } from '../utils/transaction-pool';
import { LimitCache } from '../utils/limit-cache';

export class StateHelper {
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
  public static HasUnconfirmedTransaction(id: string) {
    return global.transactionPool.has(id);
  }
  public static ClearUnconfirmedTransactions() {
    global.transactionPool.clear();
  }
  public static AddUnconfirmedTransactions(transaction: Transaction) {
    global.transactionPool.add(transaction);
  }

  // failedTrsCache
  public static InitializeFailedTrsCache() {
    global.failedTrsCache = new LimitCache<string, boolean>();
  }
  public static HasFailedTrsCache(key: string) {
    return global.failedTrsCache.has(key);
  }
  public static AddFailedTrs(key: string) {
    global.failedTrsCache.set(key, true);
  }
}
