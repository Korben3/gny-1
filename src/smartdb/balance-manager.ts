
function getCurrencyFlag(currency) {
  if (currency === 'GNY') {
    return 1;
  } if (currency.indexOf('.') !== -1) {
    // UIA
    return 2;
  }
  // gateway currency
  return 3;
}

export default class BalanceManager {
  constructor(sdb) {
    this.sdb = sdb;
  }

  get(address, currency) {
    const item = this.sdb.get('Balance', { address, currency });
    const balance = item ? item.balance : '0';
    return global.app.util.bignumber(balance);
  }

  increase(address, currency, amount) {
    if (global.app.util.bignumber(amount).eq(0)) return;
    const key = { address, currency };
    let item = this.sdb.get('Balance', key);
    if (item) {
      item.balance = global.app.util.bignumber(item.balance).plus(amount).toString(10);
      global.app.sdb.update('Balance', { balance: item.balance }, key);
    } else {
      item = this.sdb.create('Balance', {
        address,
        currency,
        balance: amount,
        flag: getCurrencyFlag(currency),
      });
    }
  }

  decrease(address, currency, amount) {
    this.increase(address, currency, `-${amount}`);
  }

  transfer(currency, amount, from, to) {
    this.decrease(from, currency, amount);
    this.increase(to, currency, amount);
  }
}