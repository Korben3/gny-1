import * as fs from 'fs';
import * as _ from 'lodash';
import * as protocolBuffers from 'protocol-buffers';

export class Protobuf {
  public schema;

  constructor(schema) {
    this.schema = schema;
  }

  encodeBlockPropose(propose) {
    const obj = _.cloneDeep(propose);
    obj.generatorPublicKey = Buffer.from(obj.generatorPublicKey, 'hex');
    obj.hash = Buffer.from(obj.hash, 'hex');
    obj.signature = Buffer.from(obj.signature, 'hex');
    return this.schema.BlockPropose.encode(obj);
  }

  decodeBlockPropose(data) {
    const obj = this.schema.BlockPropose.decode(data);
    obj.generatorPublicKey = obj.generatorPublicKey.toString('hex');
    obj.hash = obj.hash.toString('hex');
    obj.signature = obj.signature.toString('hex');
    return obj;
  }

  encodeBlockVotes(obj) {
    for (let i = 0; i < obj.signatures.length; ++i) {
      const signature = obj.signatures[i];
      signature.publicKey = Buffer.from(signature.publicKey, 'hex');
      signature.signature = Buffer.from(signature.signature, 'hex');
    }
    return this.schema.BlockVotes.encode(obj);
  }

  decodeBlockVotes(data) {
    const obj = this.schema.BlockVotes.decode(data);
    for (let i = 0; i < obj.signatures.length; ++i) {
      const signature = obj.signatures[i];
      signature.publicKey = signature.publicKey.toString('hex');
      signature.signature = signature.signature.toString('hex');
    }
    return obj;
  }

  encodeTransaction(trs) {
    const obj = _.cloneDeep(trs);
    if (typeof obj.signatures !== 'string') {
      obj.signatures = JSON.stringify(obj.signatures);
    }
    if (typeof obj.args !== 'string') {
      obj.args = JSON.stringify(obj.args);
    }

    return this.schema.Transaction.encode(obj);
  }

  decodeTransaction(data) {
    const obj = this.schema.Transaction.decode(data);
    return obj;
  }

  encodeNewBlockMessage(msg) {
    const obj = _.cloneDeep(msg);
    return this.schema.NewBlockMessage.encode(obj);
  }

  decodeNewBlockMessage(data) {
    const obj = this.schema.NewBlockMessage.decode(data);
    return obj;
  }
}

export function getSchema (schemaFile) {
  const data = fs.readFileSync(schemaFile);
  const schema = protocolBuffers(data);
  return new Protobuf(schema);
}
