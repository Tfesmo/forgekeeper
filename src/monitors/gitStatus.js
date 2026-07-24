import { execFileSync } from "node:child_process";
import { homedir } from "node:os";

function getGitInfo() {
  try {
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    let isDirty = false;
    try {
      execFileSync("git", ["diff", "--quiet"], {
        stdio: ["ignore", "ignore", "pipe"],
        timeout: 3000,
      });
    } catch {
      isDirty = true;
    }

    const unstagedResult = execFileSync("git", ["diff", "--name-only"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
    });
    const unstagedTrimmed = unstagedResult.trim();
    const unstagedCount = unstagedTrimmed ? unstagedTrimmed.split("\n").length : 0;

    const untrackedResult = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 3000,
    });
    const untrackedTrimmed = untrackedResult.trim();
    const untrackedCount = untrackedTrimmed ? untrackedTrimmed.split("\n").length : 0;

    if (untrackedCount > 0) {
      isDirty = true;
    }

    return { branch, isDirty, unstagedCount, untrackedCount };
  } catch {
    return null;
  }
}

function formatPath() {
  try {
    const cwd = process.cwd();
    const home = homedir();
    const display = cwd === home ? "~" : cwd.replace(home, "~");
    return display;
  } catch {
    return null;
  }
}

let intervalId = null;

export function start(intervalMs, emitter) {
  function emitStatus() {
    const info = getGitInfo();
    const path = formatPath();
    if (path && info) {
      emitter.emit("git_status", {
        path,
        branch: info.branch,
        isDirty: info.isDirty,
        unstagedCount: info.unstagedCount,
        untrackedCount: info.untrackedCount,
        timestamp: Date.now(),
      });
    }
  }

  emitStatus();
  intervalId = setInterval(emitStatus, intervalMs);
}

export function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
