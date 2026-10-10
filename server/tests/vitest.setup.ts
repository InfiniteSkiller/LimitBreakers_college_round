import WorkerPkg from 'web-worker';

const WorkerClass = (WorkerPkg as any).default || WorkerPkg;
(globalThis as any).Worker = WorkerClass;
