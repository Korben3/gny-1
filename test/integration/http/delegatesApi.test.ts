import * as gnyClient from '../../../packages/gny-client';
import * as lib from '../lib';
import axios from 'axios';

const config = {
  headers: {
    magic: '594fe0f3',
  },
};

const genesisSecret =
  'grow pencil ten junk bomb right describe trade rich valid tuna service';

describe('delegatesApi', () => {
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

  describe('/count', () => {
    it(
      'should get the number of delegates',
      async () => {
        const { data } = await axios.get(
          'http://localhost:4096/api/delegates/count'
        );
        expect(data.count).toBe(101);
      },
      lib.oneMinute
    );
  });

  describe('/', () => {
    it(
      'should get all the delegates',
      async done => {
        const { data } = await axios.get('http://localhost:4096/api/delegates');
        expect(data.totalCount).toBe(101);
        done();
      },
      lib.oneMinute
    );

    it(
      'should return error: "offset" must be larger than or equal to 0',
      async () => {
        const offset = -1;
        const promise = axios.get(
          'http://localhost:4096/api/delegates/' + '?offset=' + offset
        );

        expect(promise).rejects.toHaveProperty('response.data', {
          success: false,
          error:
            'child "offset" fails because ["offset" must be larger than or equal to 0]',
        });
      },
      lib.oneMinute
    );

    it(
      'should return: "limit" must be less than or equal to 101',
      async () => {
        const limit = 102;
        const promise = axios.get(
          'http://localhost:4096/api/delegates/' + '?limit=' + limit
        );

        expect(promise).rejects.toHaveProperty('response.data', {
          success: false,
          error:
            'child "limit" fails because ["limit" must be less than or equal to 101]',
        });
      },
      lib.oneMinute
    );
  });

  describe('/get', () => {
    it(
      'should get the delegate by username',
      async done => {
        // register delegate
        const username = 'xpgeng';

        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };

        await axios.post(
          'http://localhost:4096/peer/transactions',
          nameTransData,
          config
        );
        await lib.onNewBlock();

        const trs = gnyClient.basic.registerDelegate(genesisSecret);
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
          'http://localhost:4096/api/delegates/get?username=' + username
        );
        expect(data.delegate.username).toBe(username);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/getVoters', () => {
    it(
      'should get the voters',
      async done => {
        // set username
        const username = 'xpgeng';
        const nameTrs = gnyClient.basic.setUserName(username, genesisSecret);
        const nameTransData = {
          transaction: nameTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          nameTransData,
          config
        );
        await lib.onNewBlock();

        // lock the account
        const lockTrs = gnyClient.basic.lock(173000, 30 * 1e8, genesisSecret);
        const lockTransData = {
          transaction: lockTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          lockTransData,
          config
        );
        await lib.onNewBlock();

        // register delegate
        const delegateTrs = gnyClient.basic.registerDelegate(genesisSecret);
        const delegateTransData = {
          transaction: delegateTrs,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          delegateTransData,
          config
        );
        await lib.onNewBlock();

        // vote
        const trsVote = gnyClient.basic.vote(['xpgeng'], genesisSecret);
        const transVoteData = {
          transaction: trsVote,
        };
        await axios.post(
          'http://localhost:4096/peer/transactions',
          transVoteData,
          config
        );
        await lib.onNewBlock();

        // get voters
        const { data } = await axios.get(
          'http://localhost:4096/api/delegates/getVoters?username=' + username
        );
        expect(data.accounts).toHaveLength(1);
        done();
      },
      lib.oneMinute
    );
  });

  describe('/forging/enable', () => {
    it(
      'should return the error: Access denied',
      async () => {
        const publicKey =
          '0bcf038e0cb8cb61b72cb06f943afcca62094ad568276426a295ba8f550708a9';
        const secret =
          'carpet pudding topple genuine relax rally problem before pill gun nation method';

        const transData = {
          secret,
          publicKey,
        };
        const enablePromise = axios.post(
          'http://localhost:4096/api/delegates/forging/enable',
          transData,
          config
        );
        expect(enablePromise).rejects.toHaveProperty('response.data', {
          success: false,
          error: 'Access denied',
        });
      },
      lib.oneMinute
    );
  });

  describe('/forging/status', () => {
    it(
      'should get the status',
      async done => {
        const publicKey =
          '0bcf038e0cb8cb61b72cb06f943afcca62094ad568276426a295ba8f550708a9';

        const { data } = await axios.get(
          'http://localhost:4096/api/delegates/forging/status?publicKey=' +
            publicKey
        );
        expect(data).toHaveProperty('enabled');
        done();
      },
      lib.oneMinute
    );
  });
});
