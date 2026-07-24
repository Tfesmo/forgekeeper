import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

import { describe, it } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("server.js static check", () => {
  it("passes node --check (no syntax or static import errors)", () => {
    const serverPath = path.join(__dirname, "server.js");
    execSync(`node --check "${serverPath}"`, { stdio: "pipe" });
  });
});
