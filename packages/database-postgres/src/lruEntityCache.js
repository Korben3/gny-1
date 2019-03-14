const LRU = require('lru-cache');
const { UniquedEntityCache } = require('./defaultEntityUniqueIndex');
const customLogger = require('./logger');

class CustomCache {
  /**
   * @param {?} data_set
   * @param {number} data_set_value_max
   * @return {undefined}
   */
  constructor(data_set, data_set_value_max) {
    this.modelSchema = data_set;
    this.lruCache = new LRU({
      max : data_set_value_max,
      dispose : this.doEvit.bind(this)
    });
  }
  doEvit(e, exceptionLevel) {
    if (this.postEvit) {
      this.postEvit(e, exceptionLevel);
    }
  }

  clear() {
    this.lruCache.reset();
  }

  has(i) {
    return this.lruCache.has(i);
  }

  get(sid) {
    return this.lruCache.get(sid);
  }

  forEach(userFunction) {
    this.lruCache.forEach(userFunction);
  }

  set(x, mode) {
    this.lruCache.set(x, mode);
  }

  evit(context) {
    this.lruCache.del(context);
  }

  exists(typeName) {
    return this.lruCache.has(typeName);
  }

  get onEvit() {
    return this.postEvit;
  }

  set onEvit(model) {
    this.postEvit = model;
  }

  get model() {
    return this.modelSchema;
  }
};

class LRUEntityCache extends UniquedEntityCache {
  /**
   * @param {?} server
   * @return {?}
   */
  constructor(server) {
    const logger = customLogger.LogManager.getLogger("LRUEntityCache");
    super(logger, server);
  }

  getMaxCachedCount(callback) {
    var maxPrimaryDepth = callback.maxCached || LRUEntityCache.DEFULT_MAX_CACHED_COUNT;
    return Math.max(LRUEntityCache.MIN_CACHED_COUNT, maxPrimaryDepth);
  }

  createCache(e) {
    return new CustomCache(e, this.getMaxCachedCount(e));
  }
};

LRUEntityCache.MIN_CACHED_COUNT = 100;
LRUEntityCache.DEFULT_MAX_CACHED_COUNT = 5e4;

module.exports = {
  LRUEntityCache,
};
