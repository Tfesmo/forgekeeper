import os from 'os';
import path from 'path';
import Tail from 'tail-file';

const LOG_FILE = path.join(os.homedir(), 'logs', 'ikllama.log');
const FILTER_PATTERNS = ['prompt processing progress', 'draft acceptance rate'];

export function tailLogFile(pipeline, logPath) {
  const filePath = logPath || LOG_FILE;
  const tail = new Tail(filePath, { fromEnd: false });

  tail.on('line', (line) => {
    if (!pipeline) return;
    const shouldProcess = FILTER_PATTERNS.some((pattern) => line.includes(pattern));
    if (shouldProcess) {
      pipeline.receiveLine(line);
    }
  });

  tail.on('error', (err) => {
    console.error('Log monitor error:', err.message);
  });

  tail.start();
}
