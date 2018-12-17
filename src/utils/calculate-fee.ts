export default {
  1: () => 0.1,
  2: (trs) => {
    const len = trs.args[0].length;
    if (len === 2) {
      return 200;
    } else if (len === 3) {
      return 100;
    } else if (len === 4) {
      return 80;
    } else if (len === 5) {
      return 40;
    } else if (len <= 10) {
      return 10;
    }
    return 1;
  },
  3: () => 5,
  4: () => 0.1,
  5: () => 0,
  6: () => 5,
  7: () => 100,
  8: () => 0.1,
  9: () => 0,
  10: () => 100,
  11: () => 0.1,
  12: () => 0.1,
  100: () => 100,
  101: () => 500,
  102: () => 0.1,
  103: () => 0.1,
  200: () => 100,
  201: () => 1,
  202: () => 1,
  203: () => 1,
  204: () => 0.1,
  205: () => 0.1,
  300: () => 10,
  301: () => 0.1,
  302: () => 0,
  400: () => 0.1,
  401: () => 100,
  402: () => 0.01,
  403: () => 0,
  404: () => 0.01,
  405: () => 0.01,
  406: () => 0.01,
  500: () => 0,
  501: () => 0,
  502: () => 1,
  503: () => 1,
};
