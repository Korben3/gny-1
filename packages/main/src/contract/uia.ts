import { ITransfer, IAsset, IIssuer, Context } from '@gny/interfaces';
import { Issuer } from '@gny/database-postgres';
import { Asset } from '@gny/database-postgres';
import { Account } from '@gny/database-postgres';
import { Transfer } from '@gny/database-postgres';
import BigNumber from 'bignumber.js';
import { isAddress } from '@gny/utils';

export default {
  async registerIssuer(this: Context, name, desc) {
    if (arguments.length !== 2) return 'Invalid arguments length';
    if (!/^[A-Za-z]{1,16}$/.test(name)) return 'Invalid issuer name';
    if (!desc) return 'No issuer description was provided';
    const descJson = JSON.stringify(desc);
    if (descJson.length > 4096) return 'Invalid issuer description';

    const senderId = this.sender.address;
    await global.app.sdb.lock(`uia.registerIssuer@${senderId}`);
    let exists = await global.app.sdb.exists<Issuer>(Issuer, { name });
    if (exists) return 'Issuer name already exists';

    exists = await global.app.sdb.exists<Issuer>(Issuer, {
      issuerId: senderId,
    });
    if (exists) return 'Account is already an issuer';

    const issuer: IIssuer = {
      tid: this.trs.id,
      issuerId: senderId,
      name,
      desc: descJson,
    };
    await global.app.sdb.create<Issuer>(Issuer, issuer);
    return null;
  },

  async registerAsset(this: Context, symbol, desc, maximum, precision) {
    if (arguments.length !== 4) return 'Invalid arguments length';
    if (!/^[A-Z]{3,6}$/.test(symbol)) return 'Invalid symbol';
    if (desc.length > 4096) return 'Invalid asset description';
    if (!Number.isInteger(precision) || precision <= 0)
      return 'Precision should be positive integer';
    if (precision > 16 || precision < 0) return 'Invalid asset precision';
    global.app.validate('amount', maximum);

    const issuer: IIssuer = await global.app.sdb.findOne<Issuer>(Issuer, {
      condition: { issuerId: this.sender.address },
    });
    if (!issuer) return 'Account is not an issuer';

    const fullName = `${issuer.name}.${symbol}`;
    await global.app.sdb.lock(`uia.registerAsset@${fullName}`);

    const exists = await global.app.sdb.exists<Asset>(Asset, {
      name: fullName,
    });
    if (exists) return 'Asset already exists';

    const asset: IAsset = {
      tid: this.trs.id,
      name: fullName,
      timestamp: this.trs.timestamp,
      desc,
      maximum: String(maximum),
      precision,
      quantity: String(0),
      issuerId: this.sender.address,
    };
    await global.app.sdb.create<Asset>(Asset, asset);
    return null;
  },

  async issue(this: Context, name, amount) {
    if (arguments.length !== 2) return 'Invalid arguments length';
    if (!/^[A-Za-z]{1,16}.[A-Z]{3,6}$/.test(name)) return 'Invalid currency';
    global.app.validate('amount', amount);

    // Move the lock above the findOne so that first judging if it is in use in lock,
    // if it is not in use(can not find in cache), it can be updated.
    await global.app.sdb.lock(`uia.issue@${name}`);

    const asset: IAsset = await global.app.sdb.findOne<Asset>(Asset, {
      condition: { name },
    });
    if (!asset) return 'Asset not exists';

    if (asset.issuerId !== this.sender.address) return 'Permission denied';
    const quantity = new BigNumber(asset.quantity).plus(amount);
    if (quantity.gt(asset.maximum)) return 'Exceed issue limit';

    asset.quantity = quantity.toString(10);
    await global.app.sdb.update<Asset>(
      Asset,
      { quantity: String(asset.quantity) },
      { name }
    );

    await global.app.balances.increase(this.sender.address, name, amount);
    return null;
  },

  async transfer(this: Context, currency, amount, recipient) {
    if (arguments.length !== 3) return 'Invalid arguments length';
    if (currency.length > 30) return 'Invalid currency';
    if (!recipient || recipient.length > 50) return 'Invalid recipient';
    // if (!/^[A-Za-z]{1,16}.[A-Z]{3,6}$/.test(currency)) return 'Invalid currency'
    // if (!Number.isInteger(amount) || amount <= 0) return 'Amount should be positive integer'
    global.app.validate('amount', String(amount));
    const senderId = this.sender.address;

    if (senderId === recipient || this.sender.username === recipient) {
      return 'Invalid recipient';
    }

    const balance = await global.app.balances.get(senderId, currency);
    if (balance.lt(amount)) return 'Insufficient balance';

    let recipientAddress;
    let recipientName = '';
    if (recipient && isAddress(recipient)) {
      recipientAddress = recipient;
    } else {
      recipientName = recipient;
      const recipientAccount = await global.app.sdb.findOne<Account>(Account, {
        condition: { username: recipient },
      });
      if (!recipientAccount) return 'Recipient name not exist';
      recipientAddress = recipientAccount.address;
    }

    await global.app.balances.transfer(
      currency,
      amount,
      senderId,
      recipientAddress
    );
    const transfer: ITransfer = {
      tid: this.trs.id,
      height: String(this.block.height),
      senderId,
      recipientId: recipientAddress,
      recipientName,
      currency,
      amount: String(amount),
      timestamp: this.trs.timestamp,
    };
    await global.app.sdb.create<Transfer>(Transfer, transfer);
    return null;
  },
};
