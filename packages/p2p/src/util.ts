import * as Multiaddr from 'multiaddr';
import { PeerNode, ILogger } from '@gny/interfaces';
import { Bundle } from './bundle';
import * as PeerInfo from 'peer-info';

export function extractIpAndPort(peerInfo): PeerNode {
  let result: PeerNode = undefined;

  const arr = peerInfo.multiaddrs.toArray();
  for (let i = 0; i < arr.length; ++i) {
    const one = arr[i];
    const multi = Multiaddr(one);
    // checking if not 127.0.0.1 is a workaround
    // see https://github.com/libp2p/js-libp2p-floodsub/issues/58
    if (
      multi.toString().includes('tcp') &&
      multi.toString().includes('ip4') &&
      !multi.toString().includes('127.0.0.1')
    ) {
      const y = multi.nodeAddress();
      result = {
        host: y.address,
        port: Number(y.port),
      };
      break;
    }
  }
  return result;
}

export function getB58String(peerInfo: PeerInfo) {
  const b58String = peerInfo.id.toB58String();
  return b58String;
}

export function attachEventHandlers(bundle: Bundle, logger: ILogger) {
  const startCallback = function() {
    logger.info(`started node: ${getB58String(bundle.peerInfo)}`);
  };
  const stopCallback = function() {
    logger.info(`stopped node: ${getB58String(bundle.peerInfo)}`);
  };
  const errorCallback = function(err: Error) {
    logger.error(
      `error "${err.message}" for node: ${getB58String(bundle.peerInfo)}`
    );
    if (typeof err.message === 'string' && err.message.includes('EADDRINUSE')) {
      logger.warn('port is already in use, shutting down...');
      throw err;
    }
  };
  const peerDiscoveryCallback = function(peer) {
    if (!bundle.peerBook.has(peer)) {
      logger.info(
        `node ${getB58String(bundle.peerInfo)} discovered ${getB58String(peer)}`
      );
    }
  };
  const peerConnectedCallback = function(peer) {
    logger.info(
      `node ${getB58String(bundle.peerInfo)} connected with ${getB58String(
        peer
      )}`
    );
  };
  const peerDisconnectCallback = function(peer) {
    logger.info(
      `node ${getB58String(
        bundle.peerInfo
      )} got disconnected from ${getB58String(peer)}`
    );
  };

  bundle.on('start', startCallback);
  bundle.on('stop', stopCallback);
  bundle.on('error', errorCallback);
  bundle.on('peer:discovery', peerDiscoveryCallback);
  bundle.on('peer:connect', peerConnectedCallback);
  bundle.on('peer:disconnect', peerDisconnectCallback);
}

export function printOwnPeerInfo(bundle: Bundle, logger: ILogger) {
  let addresses = '';
  bundle.peerInfo.multiaddrs.forEach(
    adr => (addresses += `\t${adr.toString()}\n`)
  );
  bundle.logger.info(
    `\n[P2P] started node: ${bundle.peerInfo.id.toB58String()}\n${addresses}`
  );
}