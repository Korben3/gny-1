import {
  ITransaction,
  KeyPair,
  IBlock,
  BlockPropose,
  IConfig,
  NewBlockMessage,
  ILogger,
  UnconfirmedTransaction,
} from '@gny/interfaces';
import { IState, ISimpleCache } from '../globalInterfaces';
import { TransactionBase } from '@gny/base';
import { MAX_PAYLOAD_LENGTH } from '@gny/utils';
import * as crypto from 'crypto';
import { BlockReward } from '@gny/utils';
import { BlockBase } from '@gny/base';
import { ConsensusBase } from '@gny/base';
import { slots } from '@gny/utils';
import { copyObject } from '@gny/base';
import { StateHelper } from './StateHelper';
import { BigNumber } from 'bignumber.js';
import { Block } from '@gny/database-postgres';
import { Transaction } from '@gny/database-postgres';

const blockReward = new BlockReward();

export enum BlockMessageFitInLineResult {
  Success = 0,
  LongFork = 1,
  SyncBlocks = 2,
}

export class BlocksHelper {
  public static areTransactionsExceedingPayloadLength(
    transactions: Array<UnconfirmedTransaction | ITransaction>
  ) {
    let payloadLength = 0;

    for (const one of transactions) {
      const bytes = TransactionBase.getBytes(one);
      if (payloadLength + bytes.length > MAX_PAYLOAD_LENGTH) {
        return true;
      }
      payloadLength += bytes.length;
    }
    return false;
  }

  public static payloadHashOfAllTransactions(
    transactions: Array<UnconfirmedTransaction | ITransaction>
  ) {
    const payloadHash = crypto.createHash('sha256');

    for (const one of transactions) {
      const bytes = TransactionBase.getBytes(one);
      payloadHash.update(bytes);
    }
    return payloadHash.digest();
  }

  public static getFeesOfAll(
    transactions: Array<UnconfirmedTransaction | ITransaction>
  ) {
    return transactions.reduce(
      (prev: string, oneTrs: ITransaction) =>
        new BigNumber(prev).plus(oneTrs.fee || 0).toFixed(),
      String(0)
    );
  }

  public static generateBlockShort(
    keypair: KeyPair,
    timestamp: number,
    lastBlock: IBlock,
    unconfirmedTransactions: Array<UnconfirmedTransaction>
  ) {
    if (
      BlocksHelper.areTransactionsExceedingPayloadLength(
        unconfirmedTransactions
      )
    ) {
      throw new Error('Playload length outof range');
    }

    const payloadHash = BlocksHelper.payloadHashOfAllTransactions(
      unconfirmedTransactions
    );
    const height = new BigNumber(lastBlock.height).plus(1).toFixed();
    const prevBlockId = lastBlock.id;
    const fees = BlocksHelper.getFeesOfAll(unconfirmedTransactions);
    const count = unconfirmedTransactions.length;
    const reward = blockReward.calculateReward(height);

    const transactions = unconfirmedTransactions.map(x =>
      TransactionBase.turnIntoFullTransaction(x, height)
    );
    const block: IBlock = {
      version: 0,
      delegate: keypair.publicKey.toString('hex'),
      height,
      prevBlockId,
      timestamp,
      transactions,
      count,
      fees: String(fees),
      payloadHash: payloadHash.toString('hex'),
      reward: String(reward),
      signature: null,
      id: null,
    };

    block.signature = BlockBase.sign(block, keypair);
    block.id = BlockBase.getId(block);

    return block;
  }

  public static AreTransactionsDuplicated(transactions: ITransaction[]) {
    const appliedTransactions: ISimpleCache<ITransaction> = {};
    for (const transaction of transactions) {
      if (appliedTransactions[transaction.id]) {
        return true;
      }
      appliedTransactions[transaction.id] = transaction;
    }
    return false;
  }

  public static CanAllTransactionsBeSerialized(transactions: ITransaction[]) {
    if (!transactions) throw new Error('transactions are null');
    for (const transaction of transactions) {
      try {
        const bytes = TransactionBase.getBytes(transaction);
      } catch (err) {
        return false;
      }
    }
    return true;
  }

  public static NotEnoughActiveKeyPairs(activeKeypairs: KeyPair[]) {
    return !Array.isArray(activeKeypairs) || activeKeypairs.length === 0;
  }

  public static ManageProposeCreation(
    keypair: KeyPair,
    block: IBlock,
    config: Partial<IConfig>
  ) {
    if (!config.publicIp || !config.peerPort) {
      throw new Error('config.publicIp and config.peerPort is mandatory');
    }

    const publicIp = config.publicIp;
    const peerPort = config.peerPort;

    const serverAddr = `${publicIp}:${peerPort}`;
    let propose: BlockPropose;
    try {
      propose = ConsensusBase.createPropose(keypair, block, serverAddr);
      return propose;
    } catch (e) {
      throw new Error('Failed to create propose');
    }
  }

  public static async IsBlockAlreadyInDbIO(block: IBlock) {
    if (!new BigNumber(block.height).isEqualTo(0)) {
      const exists = await global.app.sdb.exists<Block>(Block, {
        id: block.id,
      });
      if (exists) throw new Error(`Block already exists: ${block.id}`);
    }
  }

  public static async AreAnyTransactionsAlreadyInDbIO(
    transactions: ITransaction[]
  ) {
    const idList = transactions.map(t => t.id);

    if (
      idList.length !== 0 &&
      (await global.app.sdb.exists<Transaction>(Transaction, { id: idList }))
    ) {
      throw new Error('Block contain already confirmed transaction');
    }
  }

  public static DoesNewBlockProposeMatchOldOne(
    state: IState,
    propose: BlockPropose
  ) {
    const lastPropose = state.lastPropose;

    if (
      lastPropose &&
      lastPropose.height === propose.height &&
      lastPropose.generatorPublicKey === propose.generatorPublicKey &&
      lastPropose.id !== propose.id
    ) {
      return true;
    }

    return false;
  }

  public static AlreadyReceivedPropose(state: IState, propose: BlockPropose) {
    if (state.proposeCache[propose.hash]) return true;
    else return false;
  }

  public static MarkProposeAsReceived(old: IState, propose: BlockPropose) {
    const state = StateHelper.copyState(old);

    state.proposeCache[propose.hash] = true;
    return state;
  }

  public static AlreadyReceivedThisBlock(state: IState, block: IBlock) {
    if (state.blockCache[block.id]) return true;
    else return false;
  }
  public static MarkBlockAsReceived(old: IState, block: IBlock) {
    const state = StateHelper.copyState(old);

    state.blockCache[block.id] = true;
    return state;
  }

  public static ReceivedBlockIsInRightOrder(state: IState, block: IBlock) {
    if (!state.lastBlock) {
      throw new Error('ReceivedBlockIsInRightOrder - no state.lastBlock');
    }

    const inCorrectOrder =
      block.prevBlockId === state.lastBlock.id &&
      new BigNumber(state.lastBlock.height).plus(1).isEqualTo(block.height);
    if (inCorrectOrder) {
      return true;
    } else {
      return false;
    }
  }

  public static IsNewBlockMessageAndBlockTheSame(
    newBlockMsg: NewBlockMessage,
    block: IBlock
  ) {
    if (!newBlockMsg || !block) return false;

    if (
      newBlockMsg.height !== block.height ||
      newBlockMsg.id !== block.id ||
      newBlockMsg.prevBlockId !== block.prevBlockId
    ) {
      return false;
    } else {
      return true;
    }
  }

  public static DoesTheNewBlockFitInLine(
    state: IState,
    newBlock: Pick<IBlock, 'height' | 'id' | 'prevBlockId'>
  ) {
    const lastBlock = state.lastBlock;

    // TODO: compare to other "fitInLine" comparisons?! Aren't they equal?
    const lastBlockPlus1 = new BigNumber(lastBlock.height).plus(1).toFixed();
    if (
      !new BigNumber(newBlock.height).isEqualTo(lastBlockPlus1) ||
      newBlock.prevBlockId !== lastBlock.id
    ) {
      const lastBlockPlus5 = new BigNumber(lastBlock.height).plus(5).toFixed();
      if (new BigNumber(newBlock.height).isGreaterThan(lastBlockPlus5)) {
        return BlockMessageFitInLineResult.LongFork;
      } else {
        return BlockMessageFitInLineResult.SyncBlocks;
      }
    }
    return BlockMessageFitInLineResult.Success;
  }

  public static IsBlockchainReady(
    state: IState,
    currentMilliSeconds: number,
    logger: ILogger
  ) {
    const lastBlock = state.lastBlock;
    // get next slot from current from current milliseconds (Date.now())
    const nextSlot =
      slots.getSlotNumber(slots.getEpochTime(currentMilliSeconds)) + 1;
    const lastSlot = slots.getSlotNumber(lastBlock.timestamp);
    if (nextSlot - lastSlot >= 12) {
      logger.warn('Blockchain is not ready', {
        getNextSlot: slots.getNextSlot(),
        lastSlot,
        lastBlockHeight: lastBlock.height,
      });
      return false;
    }
    return true;
  }

  public static SetLastBlock(old: IState, block: IBlock) {
    const state = StateHelper.copyState(old);

    state.lastBlock = block; // copy block?
    return state;
  }

  public static ProcessBlockCleanup(old: IState) {
    const state = StateHelper.copyState(old);

    state.blockCache = {};
    state.proposeCache = {};
    state.lastVoteTime = null;
    state.privIsCollectingVotes = false;

    return state;
  }

  public static setPreGenesisBlock(old: IState) {
    const state = StateHelper.copyState(old);

    state.lastBlock = {
      height: String(-1),
    } as IBlock;

    return state;
  }

  public static SetLastPropose(
    old: IState,
    lastVoteTime: number,
    oldPropose: BlockPropose
  ) {
    const state = StateHelper.copyState(old);
    const propose = copyObject(oldPropose);

    state.lastVoteTime = lastVoteTime;
    state.lastPropose = propose;

    return state;
  }

  public static verifyBlockSlot(
    state: IState,
    currentMilliSeconds: number,
    block: IBlock
  ) {
    const blockSlotNumber = slots.getSlotNumber(block.timestamp);
    const lastBlockSlotNumber = slots.getSlotNumber(state.lastBlock.timestamp);

    const currentEpochTime = slots.getEpochTime(currentMilliSeconds);
    const nextSlotNumber = slots.getSlotNumber(currentEpochTime) + 1;

    if (blockSlotNumber > nextSlotNumber) {
      return false;
    }
    if (blockSlotNumber <= lastBlockSlotNumber) {
      return false;
    }
    return true;
  }
}
