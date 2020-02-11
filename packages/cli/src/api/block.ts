import * as fs from 'fs';
import * as crypto from 'crypto';
import { ApiConfig } from '../lib/api';
import Api from '../lib/api';
import { BlockBase, TransactionBase } from '@gny/base';
import { IBlock } from '@gny/interfaces';

let globalOptions: ApiConfig;
let baseUrl: string;

baseUrl = `http://127.0.0.1:4096`;

export async function getHeight() {
  await Api.get(baseUrl + '/api/blocks/getHeighte');
}

export async function getMilestone() {
  await Api.get(baseUrl + '/api/blocks/getMilestone');
}

export async function getReward() {
  await Api.get(baseUrl + '/api/blocks/getReward');
}

export async function getSupply() {
  await Api.get(baseUrl + '/api/blocks/getSupply');
}

export async function getStatus() {
  await Api.get(baseUrl + '/api/blocks/getStatus');
}

export async function getBlocks(options) {
  const params = {
    limit: options.limit,
    orderBy: options.sort,
    offset: options.offset,
  };
  await Api.get(baseUrl + '/api/blocks', params);
}

export async function getBlockById(id: string) {
  const params = { id: id };
  await Api.get(baseUrl + '/api/blocks/getBlock', params);
}

export async function getBlockByHeight(height: string) {
  const params = { height: height };
  await Api.get(baseUrl + '/api/blocks/getBlock', params);
}

export function getBlockBytes(options) {
  let block;
  try {
    block = JSON.parse(fs.readFileSync(options.file, 'utf8'));
  } catch (e) {
    console.log('Invalid transaction format');
    return;
  }
  console.log(BlockBase.getBytes(block, true).toString('hex'));
}

export function getBlockId(options) {
  let block: IBlock;
  try {
    block = JSON.parse(fs.readFileSync(options.file, 'utf8'));
  } catch (e) {
    console.log('Invalid transaction format');
    return;
  }
  console.log(BlockBase.getId(block));
}

export function getBlockPayloadHash(options) {
  let block: IBlock;
  try {
    block = JSON.parse(fs.readFileSync(options.file, 'utf8'));
  } catch (e) {
    console.log('Invalid transaction format');
    return;
  }
  const payloadHash = crypto.createHash('sha256');
  for (let i = 0; i < block.transactions.length; ++i) {
    payloadHash.update(TransactionBase.getBytes(block.transactions[i]));
  }
  console.log(payloadHash.digest().toString('hex'));
}

export default function block(program: ApiConfig) {
  globalOptions = program;
  baseUrl = `http://${globalOptions.host}:${globalOptions.port}`;

  program
    .command('getheight')
    .description('get latest block height')
    .action(getHeight);

  program
    .command('getstatus')
    .description('get block status')
    .action(getStatus);

  program
    .command('getmilestone')
    .description('get block milestone')
    .action(getMilestone);

  program
    .command('getreward')
    .description('get block reward')
    .action(getReward);

  program
    .command('getsupply')
    .description('get block supply')
    .action(getSupply);

  program
    .command('getblocks')
    .description('get blocks')
    .option('-o, --offset <n>', '')
    .option('-l, --limit <n>', '')
    .option(
      '-s, --sort <field:mode>',
      'height:asc, totalAmount:asc, totalFee:asc'
    )
    .option('-t, --transactions', 'true, false')
    .action(getBlocks);

  program
    .command('getblockbyid <id>')
    .description('get block by id')
    .action(getBlockById);

  program
    .command('getblockbyheight <height>')
    .description('get block by height')
    .action(getBlockByHeight);

  program
    .command('getblockbytes')
    .description('get block bytes')
    .requiredOption('-f, --file <file>', 'block file')
    .action(getBlockBytes);

  program
    .command('getblockid')
    .description('get block id')
    .requiredOption('-f, --file <file>', 'block file')
    .action(getBlockId);

  program
    .command('getblockpayloadhash')
    .description('get block bytes')
    .requiredOption('-f, --file <file>', 'block file')
    .action(getBlockPayloadHash);
}
