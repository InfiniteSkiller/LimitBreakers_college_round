import Worker from 'web-worker';

(globalThis as any).Worker = Worker;