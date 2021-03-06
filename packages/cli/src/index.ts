#!/usr/bin/env node

import * as program from 'commander';

import account from './api/account';
import basic from './api/basic';
import block from './api/block';
import delegate from './api/delegate';
import system from './api/system';
import peer from './api/peer';
import transaction from './api/transaction';
import uia from './api/uia';
import exchange from './api/exchange';

import newGenesisBlock from './lib/newGenesisBlock';
import state from './lib/state';
import newP2PSecret from './lib/newP2PSecret';
import { ApiConfig } from './lib/api';

const api = [
  account,
  basic,
  block,
  delegate,
  system,
  peer,
  transaction,
  uia,
  exchange,
];

const lib = [newGenesisBlock, state, newP2PSecret];

function main() {
  global.host = process.env.GNY_HOST || '127.0.0.1';
  global.port = Number(process.env.GNY_PORT || 4096);

  program
    .option('--host <host>', 'host')
    .on('option:host', host => {
      if (!host) {
        console.log('--host is not an valid');
        process.exit(1);
      }
      global.host = host;
    })
    .option('--port <port>', 'port')
    .on('option:port', port => {
      if (!Number(port)) {
        console.log('--port is not an valid');
        process.exit(1);
      }
      global.port = Number(port);
    });

  api.forEach(one => one(program as ApiConfig));
  lib.forEach(one => one(program));

  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
  program.parse(process.argv);
}

main();
