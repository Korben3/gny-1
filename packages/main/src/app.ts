import * as program from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { createLogger, LogLevel } from '@gny/logger';

import Application from './index';
import * as packageJson from '../package.json';
import { IConfig, IBlock } from '@gny/interfaces';
import * as ip from 'ip';

const version = packageJson.version;

function main() {
  process.stdin.resume();

  program
    .version(version)
    .option('--config <path>', 'Config file path')
    .option('--port <port>', 'Listening port number')
    .option('--address <ip>', 'Listening host name or ip')
    .option('--genesisblock <path>', 'Genesisblock path')
    .option('--peers [peers...]', 'Peers list')
    .option('--log <level>', 'Log level: log|trace|debug|info|warn|error|fatal')
    .option('--base <dir>', 'Base directory')
    .option('--ormConfig <file>', 'ormconfig.json file')
    .option(
      '--privateP2PKey <key>',
      'Private P2P Key (base64 encoded) - overrides p2p_key.json file'
    )
    .option('--secret [secret...]', 'comma separated secrets')
    .option('--publicIP <ip>', 'Public IP of own server, default private IP')
    .option('--network <network>', 'Must be: localnet | testnet | mainnet')
    .on('--help', () => {
      console.log(`\nEnvironment Variables:
  GNY_NETWORK=<network>    Must be: localnet | testnet | mainnet
  GNY_PORT=<port>          Listening port number
  GNY_LOG_LEVEL=<level>    log|trace|debug|info|warn|error|fatal
  GNY_P2P_SECRET=<key>     Private P2P Key (base64 encoded) - overrides p2p_key.json file
  GNY_SECRET=[secret...]   comma separated secrets
  GNY_PUBLIC_IP=<ip>       Public IP of own server, default private IP
  GNY_P2P_PEERS=[peers...] comma separated peers
  GNY_ADDRESS=<address>    Listening host name or ip
      `);
    })
    .parse(process.argv);

  const baseDir = program.base || process.cwd();
  const transpiledDir = path.join(process.cwd(), 'packages/main/dist/src/');

  // default config.json path
  let appConfigFile = path.join(baseDir, 'config.json');
  // config.json path can be overriden
  if (program.config) {
    appConfigFile = path.resolve(process.cwd(), program.config);
  }
  const appConfig: IConfig = JSON.parse(fs.readFileSync(appConfigFile, 'utf8'));

  const pidFile = appConfig.pidFile || path.join(baseDir, 'GNY.pid');
  if (fs.existsSync(pidFile)) {
    console.log('Error: Server has already started.');
    return;
  }

  appConfig.version = version;
  appConfig.baseDir = baseDir;
  appConfig.buildVersion = String(new Date());

  // default network is "localnet"
  appConfig.netVersion =
    program.network || process.env['GNY_NETWORK'] || 'localnet';

  // genesisBlock.(localnet | testnet | mainnet).json
  let genesisBlockPath = path.join(
    baseDir,
    `genesisBlock.${appConfig.netVersion}.json`
  );
  // or custom genesisBock.json path
  if (program.genesisblock) {
    if (program.network || process.env['GNY_NETWORK']) {
      console.log(
        'Error: --network (GNY_NETWORK) and --genesisblock are not allowed'
      );
      return;
    }
    genesisBlockPath = path.resolve(baseDir, program.genesisblock);
  }
  // load genesisBlock
  const genesisBlock: IBlock = JSON.parse(
    fs.readFileSync(genesisBlockPath, 'utf8')
  );

  // port, default 4096
  appConfig.port = program.port || process.env['GNY_PORT'] || 4096;
  appConfig.port = Number(appConfig.port);

  // peerPort
  appConfig.peerPort = appConfig.port + 1;

  if (program.address || process.env['GNY_ADDRESS']) {
    appConfig.address = program.address || process.env['GNY_ADDRESS'];
  }

  if (program.peers || process.env['GNY_P2P_PEERS']) {
    const peers = program.peers || process.env['GNY_P2P_PEERS'];
    appConfig.peers.bootstrap = peers.split(',');
  }

  // loglevel, default info
  appConfig.logLevel = program.log || process.env['GNY_LOG_LEVEL'] || 'info';

  const pathToLogFile = path.join(transpiledDir, 'logs', 'debug.log');
  const logger = createLogger(pathToLogFile, LogLevel[appConfig.logLevel]);

  // path to ormconfig.json (default)
  let ormConfigFilePath = path.join(baseDir, 'ormconfig.json');
  // or custom ormconfig.json path
  if (program.ormConfig) {
    ormConfigFilePath = path.join(baseDir, program.ormConfig);
  }
  // load ormConfigPath
  appConfig.ormConfigRaw = fs.readFileSync(ormConfigFilePath, {
    encoding: 'utf8',
  });

  if (program.privateP2PKey || process.env['GNY_P2P_SECRET']) {
    appConfig.peers.privateP2PKey =
      program.privateP2PKey || process.env['GNY_P2P_SECRET'];
  } else {
    console.error(`--privateP2PKey="" or GNY_P2P_SECRET="" are mandatory`);
    process.exit(1);
  }

  if (program.secret || process.env['GNY_SECRET']) {
    const userSecret = program.secret || process.env['GNY_SECRET'];
    appConfig.forging.secret = userSecret.split(',');
  }

  if (program.publicIP || process.env['GNY_PUBLIC_IP']) {
    appConfig.publicIp = program.publicIP || process.env['GNY_PUBLIC_IP'];
  } else {
    appConfig.publicIp = ip.address();
  }

  // asign config to global variable
  global.Config = appConfig;

  const options = {
    appConfig,
    genesisBlock,
    logger,
  };

  const application = new Application(options);
  (async () => {
    try {
      await application.run();
    } catch (e) {
      console.log(e);
    }
  })();
}

main();
