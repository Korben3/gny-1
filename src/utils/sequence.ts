import { queue } from 'async';
import { TIMEOUT } from '../../packages/utils/constants';
import { ISequence } from '../../packages/interfaces';

function tick(task, cb) {
  let isCallbacked = false;
  const done = (err, res) => {
    if (isCallbacked) {
      return;
    }
    isCallbacked = true;
    if (task.done) {
      setImmediate(task.done, err, res);
    }
    setImmediate(cb);
  };
  setTimeout(() => {
    if (!isCallbacked) {
      done('Worker task timeout');
    }
  }, TIMEOUT * 1000);
  let args = [done];
  if (task.args) {
    args = args.concat(task.args);
  }
  try {
    task.worker.apply(task.worker, args);
  } catch (e) {
    done(e.toString());
  }
}

export default class Sequence implements ISequence {
  private counter: number;
  private readonly name: string;
  private queue: AsyncQueue<any>;

  constructor(config) {
    this.counter = 1;
    this.name = config.name;

    this.queue = queue(tick, 1);
  }

  add(worker, args?, cb?) {
    let done;
    if (!cb && args && typeof args === 'function') {
      done = args;
    } else {
      done = cb;
    }
    if (worker && typeof worker === 'function') {
      const task = { worker, done };
      if (Array.isArray(args)) {
        task.args = args;
      }
      task.counter = this.counter++;
      this.queue.push(task);
    }
  }

  count() {
    return this.queue.length();
  }
}
