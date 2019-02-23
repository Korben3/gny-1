
import { Bundle } from './bundle';
import * as PeerId from 'peer-id';
import { extractIpAndPort } from './util';

import { P2PMessage } from '../../src/interfaces';

export class Peer2Peer {
  private bundle: Bundle;
  private peerInfo = null;
  private bootstrapNode: string;

  constructor (peerInfo: any, bootstrapNode: string) {
    this.peerInfo = peerInfo;
    this.bootstrapNode = bootstrapNode;
  }

  public startAsync = async () => {
    const peerInfo = this.peerInfo;
    const configuration = {
      peerInfo,
      config: {
        peerDiscovery: {
          bootstrap: {
            list: this.bootstrapNode ? [ this.bootstrapNode ] : [],
          },
        },
      },
    };

    this.bundle = new Bundle(configuration);

    this.bundle.on('stop', this.stopped);
    this.bundle.on('error', this.errorOccurred);
    this.bundle.on('peer:connect', this.addPeerToDb);
    this.bundle.on('peer:disconnect', this.removePeerFromDb);
    this.bundle.on('peer:discovery', this.peerDiscovery);
    await this.bundle.startAsync();
  }

  private stopped = (err) => {
    global.app.logger.info('[P2P] p2p node stopped');
  }

  private errorOccurred = (err) => {
    global.app.logger.error(`[P2P] error occurred: ${err.message}`);
    if (typeof err.message === 'string' && err.message.includes('EADDRINUSE')) {
      global.app.logger.warn('port is already in use, shutting down...');
      throw new Error(err);
    }
  }

  public stop = (cb) => {
    this.bundle.stop(cb);
  }

  subscribe (topic: string, handler: any) {
    const filterBroadcastsEventHandler = (message: P2PMessage) => {
      // this filters messages out which are published from the own node
      if (message.from === this.bundle.peerInfo.id.toB58String()) {
        return;
      }

      const id = PeerId.createFromB58String(message.from);
      this.bundle.peerRouting.findPeer(id, {}, (err, result) => { // find peer in routing table that broadcasted message
        if (err) {
          global.app.logger.warn('could not find peer that broadcasted message');
          return;
        }

        const finish = (peerToAttach) => {
          const extendedMsg: P2PMessage = {
            ...message,
            peerInfo: extractIpAndPort(peerToAttach),
          };
          handler(extendedMsg);
        };

        this.bundle.dial(result, (erro, conn) => { // dial to peer that broadcasted message
          if (erro) {
            global.app.logger.warn(`could not dial peer ${id}`);
            return;
          }
          return finish(result);
        });
      });
    };

    this.bundle.pubsub.subscribe(topic, filterBroadcastsEventHandler, () => {});
  }

  broadcastProposeAsync(data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.bundle.isStarted()) {
        resolve();
      }
      this.bundle.pubsub.publish('propose', data, (err) => {
        if (err) reject(err.message);
        else resolve();
      });
    });
  }

  broadcastTransactionAsync(data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.bundle.isStarted()) {
        resolve();
      }
      this.bundle.pubsub.publish('transaction', data, (err) => {
        if (err) reject(err.message);
        else resolve();
      });
    });
  }

  broadcastNewBlockHeaderAsync(data: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.bundle.isStarted()) {
        resolve();
      }
      this.bundle.pubsub.publish('newBlockHeader', data, (err) => {
        if (err) reject(err.message);
        else resolve();
      });
    });
  }

  private addPeerToDb(peer) {
    // TODO implement
    global.app.logger.info(`[P2P] peer:connect:${peer.id.toB58String()}`);
  }

  private removePeerFromDb = (peer) => {
    // TODO implemnet
    global.app.logger.info(`[P2P] peer:disconnect:${peer.id.toB58String()}`);
    this.bundle.peerBook.remove(peer);
  }

  private peerDiscovery = async (peer) => {
    // do not spam log output: the bootstrap mechanism tries every 30s to connect to the bootstrap node(s)
    if (!this.bundle.peerBook.has(peer)) {
      global.app.logger.info(`[P2P] discovered peer: ${peer.id.toB58String()}`);
    }
    try {
      // this action establishes a __Connection__ to the newly discovered peer
      // this also adds the peer to the peerBook so the pubsub mechanism can publish to this peer
      await this.bundle.dialAsync(peer);
    } catch (err) {
      global.app.logger.info(`[P2P] could not dial to ${peer.id.toB58String()}`);
    }
  }

  public getRandomNode = () => {
    const peerInfo = this.bundle.getRandomPeer();
    if (peerInfo) {
      const extracted = extractIpAndPort(peerInfo);
      global.app.logger.info(`[P2P] getRandomPeer: ${peerInfo.id.toB58String()}; ${JSON.stringify(extracted)}`);
      return extracted;
    }
  }
}