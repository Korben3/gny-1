import * as fs from 'fs';
import * as crypto from 'crypto';
import * as ed from '@gny/ed';
import { TransactionBase } from '@gny/base';
import { ApiConfig } from '../lib/api';
import Api from '../lib/api';
import { ITransaction, KeyPair } from '@gny/interfaces';
import { getBaseUrl } from '../getBaseUrl';

export async function getUnconfirmedTransactions(options) {
  const params = {
    senderPublicKey: options.key,
    address: options.address,
  };
  await Api.get(getBaseUrl() + '/api/transactions/unconfirmed', params);
}

export async function getTransactions(options) {
  const params = {
    limit: options.limit,
    offset: options.offset,
    id: options.id,
    senderId: options.senderId,
    senderPublicKey: options.senderPublicKey,
    blockId: options.blockId,
    type: options.type,
    height: options.height,
    message: options.message,
  };
  await Api.get(getBaseUrl() + '/api/transactions/', params);
}

export async function getUnconfirmedTransaction(id: string) {
  const params = { id: id };
  await Api.get(getBaseUrl() + '/api/transactions/unconfirmed/get', params);
}

export async function sendMoney(options) {
  const hash = crypto
    .createHash('sha256')
    .update(options.secret, 'utf8')
    .digest();
  const keypair = ed.generateKeyPair(hash);

  let secondKeypair: undefined | KeyPair = undefined;
  if (options.secondSecret) {
    secondKeypair = ed.generateKeyPair(
      crypto
        .createHash('sha256')
        .update(options.secondSecret, 'utf8')
        .digest()
    );
  }
  const trs = TransactionBase.create({
    type: 0,
    fee: String(10000000),
    keypair: keypair,
    secondKeypair: secondKeypair,
    args: [options.amount, options.recipient],
    message: options.message,
  });
  await Api.post(getBaseUrl() + '/peer/transactions', { transaction: trs });
}

export async function sendTransactionWithFee(options) {
  const hash = crypto
    .createHash('sha256')
    .update(options.secret, 'utf8')
    .digest();
  const keypair = ed.generateKeyPair(hash);

  let secondKeypair: undefined | KeyPair = undefined;
  if (options.secondSecret) {
    secondKeypair = ed.generateKeyPair(
      crypto
        .createHash('sha256')
        .update(options.secondSecret, 'utf8')
        .digest()
    );
  }

  const trs = TransactionBase.create({
    type: Number(options.type),
    fee: String(options.fee) || String(10000000),
    message: options.message,
    args: JSON.parse(options.args),
    keypair: keypair,
    secondKeypair: secondKeypair,
  });
  await Api.post(getBaseUrl() + '/peer/transactions', { transaction: trs });
}

export function getTransactionBytes(options: any) {
  let trs;
  try {
    trs = JSON.parse(fs.readFileSync(options.file, 'utf8'));
  } catch (e) {
    console.log('Invalid transaction format');
    return;
  }
  console.log(TransactionBase.getBytes(trs, true, true).toString('hex'));
}

export function getTransactionId(options) {
  let trs: ITransaction;
  try {
    trs = JSON.parse(fs.readFileSync(options.file, 'utf8'));
  } catch (e) {
    console.log('Invalid transaction format');
    return;
  }
  console.log(TransactionBase.getId(trs));
}

export function verifyBytes(options) {
  console.log(
    TransactionBase.verifyBytes(
      options.bytes,
      options.signature,
      options.publicKey
    )
  );
}

export default function transaction(program: ApiConfig) {
  program
    .command('getunconfirmedtransactions')
    .description('get unconfirmed transactions')
    .option('-k, --key <sender public key>', '')
    .option('-a, --address <address>', '')
    .action(getUnconfirmedTransactions);

  program
    .command('gettransactions')
    .description('get transactions')
    .option('-l, --limit <n>', '')
    .option('-o, --offset <n>', '')
    .option('-i, --id <id>', '')
    .option('--senderId <id>', '')
    .option('--senderPublicKey <key>', '')
    .option('-b, --blockId <id>', '')
    .option('-t, --type <n>', 'transaction type')
    .option('-h, --height <n>', '')
    .option('-m, --message <message>', '')
    .action(getTransactions);

  program
    .command('gettransaction <id>')
    .description('get unconfirmed transaction by id')
    .action(getUnconfirmedTransaction);

  program
    .command('sendmoney')
    .description('send money to some address')
    .requiredOption('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .requiredOption('-a, --amount <n>', '')
    .requiredOption('-r, --recipient <address>', '')
    .option('-m, --message <message>', '')
    .action(sendMoney);

  program
    .command('gettransactionbytes')
    .description('get transaction bytes')
    .requiredOption('-f, --file <file>', 'transaction file')
    .action(getTransactionBytes);

  program
    .command('gettransactionid')
    .description('get transaction id')
    .requiredOption('-f, --file <file>', 'transaction file')
    .action(getTransactionId);

  program
    .command('verifybytes')
    .description('verify bytes/signature/publickey')
    .requiredOption('-b, --bytes <bytes>', 'transaction or block bytes')
    .requiredOption(
      '-s, --signature <signature>',
      'transaction or block signature'
    )
    .requiredOption('-p, --publicKey <publicKey>', 'signer public key')
    .action(verifyBytes);

  program
    .command('transaction')
    .description('create a transaction in mainchain with user specified fee')
    .requiredOption('-e, --secret <secret>', '')
    .option('-s, --secondSecret <secret>', '')
    .requiredOption('-t, --type <type>', 'transaction type')
    .requiredOption('-a, --args <args>', 'json array format')
    .option('-m, --message <message>', '')
    .requiredOption('-f, --fee <fee>', 'transaction fee')
    .action(sendTransactionWithFee);
}
