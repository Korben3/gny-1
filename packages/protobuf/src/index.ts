import * as fs from 'fs';
import * as _ from 'lodash';
import * as protocolBuffers from 'protocol-buffers';
import {
  NewBlockMessage,
  BlockPropose,
  ITransaction,
  IProtobuf,
  UnconfirmedTransaction,
} from '@gny/interfaces';

export class Protobuf implements IProtobuf {
  public schema;

  constructor(schema) {
    this.schema = schema;
  }

  encodeBlockPropose(propose: BlockPropose): Buffer {
    const obj = _.cloneDeep(propose);
    return this.schema.BlockPropose.encode(obj);
  }

  decodeBlockPropose(data: Buffer): BlockPropose {
    const obj = this.schema.BlockPropose.decode(data);
    return obj;
  }

  encodeBlockVotes(obj: any): Buffer {
    for (let i = 0; i < obj.signatures.length; ++i) {
      const signature = obj.signatures[i];
      signature.publicKey = Buffer.from(signature.publicKey, 'hex');
      signature.signature = Buffer.from(signature.signature, 'hex');
    }
    return this.schema.BlockVotes.encode(obj);
  }

  decodeBlockVotes(data: Buffer) {
    const obj = this.schema.BlockVotes.decode(data);
    for (let i = 0; i < obj.signatures.length; ++i) {
      const signature = obj.signatures[i];
      signature.publicKey = signature.publicKey.toString('hex');
      signature.signature = signature.signature.toString('hex');
    }
    return obj;
  }

  encodeUnconfirmedTransaction(trs: UnconfirmedTransaction): Buffer {
    const obj = _.cloneDeep(trs);
    if (typeof obj.signatures !== 'string') {
      obj.signatures = JSON.stringify(obj.signatures);
    }
    if (typeof obj.args !== 'string') {
      obj.args = JSON.stringify(obj.args);
    }

    return this.schema.UnconfirmedTransaction.encode(obj);
  }

  decodeUnconfirmedTransaction(data: Buffer) {
    const obj = this.schema.UnconfirmedTransaction.decode(
      data
    ) as UnconfirmedTransaction;
    // this is default protobuf behaviour to add an empty string
    if (obj.secondSignature === '') {
      delete obj.secondSignature;
    }
    return obj;
  }

  encodeNewBlockMessage(msg): Buffer {
    const obj = _.cloneDeep(msg);
    return this.schema.NewBlockMessage.encode(obj);
  }

  decodeNewBlockMessage(data: Buffer): NewBlockMessage {
    const obj = this.schema.NewBlockMessage.decode(data);
    return obj;
  }
}

export function getSchema(schemaFile: string) {
  const data = fs.readFileSync(schemaFile);
  const schema = protocolBuffers(data);
  return new Protobuf(schema);
}
