import * as lib from '../lib';
import axios from 'axios';

describe('peerApi', () => {
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
      'should get peer info',
      async done => {
        const { data } = await axios.get('http://localhost:4096/api/peers');
        expect(data).toHaveProperty('count');
        try {
          const { data } = await axios.get('http://localhost:4096/api/peers');
          console.log(data);
        } catch (error) {
          console.log(error);
        }
        done();
      },
      lib.oneMinute
    );
  });

  describe('/version', () => {
    it(
      'should get the version',
      async done => {
        const { data } = await axios.get(
          'http://localhost:4096/api/peers/version'
        );
        expect(data).toHaveProperty('version');
        done();
      },
      lib.oneMinute
    );
  });
});
