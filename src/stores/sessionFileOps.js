import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  readdirSync,
  existsSync,
  renameSync,
} from "fs";
import { join, isAbsolute } from "path";

const rawSessionDir = process.env.SESSION_DIR || ".forgekeeper/sessions";
export const SESSION_DIR = isAbsolute(rawSessionDir) ? rawSessionDir : join(process.cwd(), rawSessionDir);

export function ensureSessionDir() {
  if (!existsSync(SESSION_DIR)) {
    mkdirSync(SESSION_DIR, { recursive: true });
  }
}

ensureSessionDir();

export function readSessionFile(sessionId) {
  const file = join(SESSION_DIR, `${sessionId}.json`);
  return JSON.parse(readFileSync(file, "utf-8"));
}

export function writeSessionFile(sessionId, data) {
  ensureSessionDir();
  writeFileSync(join(SESSION_DIR, `${sessionId}.json`), JSON.stringify(data, null, 2));
}

export function writeSessionFileAtomic(sessionId, data) {
  ensureSessionDir();
  const file = join(SESSION_DIR, `${sessionId}.json`);
  const tmpFile = file + ".tmp." + process.pid;
  writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  renameSync(tmpFile, file);
}

export function deleteSessionFile(sessionId) {
  try {
    rmSync(join(SESSION_DIR, `${sessionId}.json`));
  } catch {
    // File may already be deleted
  }
}

export function listSessionFiles() {
  ensureSessionDir();
  try {
    return readdirSync(SESSION_DIR);
  } catch {
    return [];
  }
}
