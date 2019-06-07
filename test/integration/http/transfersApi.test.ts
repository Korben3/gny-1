import * as gnyJS from '../../../packages/gny-js';
import * as lib from '../lib';
import axios from 'axios';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

describe('transfersApi', () => {
  beforeAll(async done => {
    await lib.deleteOldDockerImages();
    await lib.buildDockerImage();
    done();
  }, lib.tenMinutes);

  beforeEach(async done => {
    await lib.spawnContainer();
    done();
  }, lib.oneMinute);

  afterEach(async done => {
    await lib.stopAndKillContainer();
    done();
  }, lib.oneMinute);

  describe('/', () => {
    it(
      'should get transfers',
      async done => {
        const senderId = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
        const message = '';

        // Transaction
        const trs = gnyJS.basic.transfer(
          recipient,
          amount,
          message,
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const { data } = await axios.get(
          'http://localhost:4096/api/transfers?ownerId=' + senderId
        );
        expect(data.count).toBe(2);
        expect(data).toHaveProperty('transfers');
        done();
      },
      lib.oneMinute
    );
  });

  describe('/amount', () => {
    it(
      'should get the amount according to an interval of timestamp',
      async done => {
        const senderId = 'G4GDW6G78sgQdSdVAQUXdm5xPS13t';
        const amount = 5 * 1e8;
        const recipient = 'GuQr4DM3aiTD36EARqDpbfsEHoNF';
        const message = '';

        // Transaction
        const trs = gnyJS.basic.transfer(
          recipient,
          amount,
          message,
          genesisSecret
        );
        const transData = {
          transaction: trs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          transData,
          config
        );
        await lib.onNewBlock();

        const trsData = await axios.get(
          'http://localhost:4096/api/transfers?ownerId=' + senderId
        );

        // get the amount
        const startTimestamp = trsData.data.transfers[0].timestamp;
        const endTimestamp = startTimestamp + 10000;

        const { data } = await axios.get(
          'http://localhost:4096/api/transfers/amount?startTimestamp=' +
            startTimestamp +
            '&endTimestamp=' +
            endTimestamp
        );
        expect(data.count).toBe(1);
        expect(data).toHaveProperty('strTotalAmount');
        done();
      },
      lib.oneMinute
    );
  });
});
