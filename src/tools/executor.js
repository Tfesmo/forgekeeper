import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, resolve } from "path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");

/**
 * Checks if a file appears to be binary by looking for null bytes.
 * Returns true if binary, false if text.
 */
function isBinaryContent(filePath) {
  try {
    if (!existsSync(filePath)) return false;
    const fd = readFileSync(filePath);
    return fd.indexOf(0) !== -1;
  } catch {
    return false;
  }
}

/**
 * Interpolates $paramName placeholders in args array with provided arguments.
 * Removes args with unresolved placeholders for optional params.
 */
function interpolateArgs(args, toolArgs) {
  if (!Array.isArray(args)) return args;
  return args
    .map((arg) => {
      if (typeof arg !== "string") return arg;
      return arg.replace(/\$(\w+)/g, (match, key) => {
        const val = toolArgs[key];
        return val != null ? val : match;
      });
    })
    .filter((arg) => {
      if (typeof arg !== "string") return true;
      if (arg.startsWith("$") && arg.length > 1) return false;
      return true;
    });
}

/**
 * Executes a tool call by spawning its configured command.
 */
export function executeCommandTool(toolCall, toolConfig) {
  const _toolName = toolCall.function?.name;
  let toolArgs;
  try {
    toolArgs = JSON.parse(toolCall.function?.arguments || "{}");
  } catch {
    toolArgs = {};
  }

  const paramsDef = toolConfig.params || {};
  const missingParams = [];
  for (const [key, def] of Object.entries(paramsDef)) {
    if (def.required && !(key in toolArgs)) {
      missingParams.push(key);
    }
  }

  if (missingParams.length > 0) {
    return Promise.resolve({
      role: "tool",
      tool_call_id: toolCall.id,
      content: `Error: missing required parameter(s): ${missingParams.join(", ")}`,
    });
  }

  const interpolatedArgs = interpolateArgs(toolConfig.args || [], toolArgs);
  const commandCwd = resolve(PROJECT_ROOT, toolConfig.cwd || "./");

  if (!toolConfig.allow_binary) {
    for (const arg of interpolatedArgs) {
      if (typeof arg === "string" && existsSync(arg)) {
        if (isBinaryContent(arg)) {
          return Promise.resolve({
            role: "tool",
            tool_call_id: toolCall.id,
            content: `Error: "${arg}" appears to be a binary file. Binary file support is disabled for this tool.`,
          });
        }
      }
    }
  }

  return new Promise((resolve) => {
    const maxLines = toolConfig.max_lines ?? 100;
    let collectedLines = 0;
    let outputTruncated = false;

    const child = spawn(toolConfig.command, interpolatedArgs, { cwd: commandCwd });

    const stdoutChunks = [];
    let stderr = "";
    let timedOut = false;
    let killedEarly = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, 15_000);

    child.stdout?.on("data", (data) => {
      if (collectedLines >= maxLines) {
        outputTruncated = true;
        return;
      }
      stdoutChunks.push(data);
      const text = data.toString("utf-8");
      const lineCount = (text.match(/\n/g) || []).length;
      if (collectedLines + lineCount >= maxLines) {
        collectedLines = maxLines;
        outputTruncated = true;
        child.kill("SIGTERM");
        killedEarly = true;
      } else {
        collectedLines += lineCount;
      }
    });

    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (err) => {
      clearTimeout(timeout);
      resolve({
        role: "tool",
        tool_call_id: toolCall.id,
        content: `Error: failed to execute "${toolConfig.command}": ${err.message}`,
      });
    });

    child.on("close", (code) => {
      clearTimeout(timeout);

      if (timedOut) {
        resolve({
          role: "tool",
          tool_call_id: toolCall.id,
          content: `Error: command timed out after 15 seconds`,
        });
        return;
      }

      const rawOutput = Buffer.concat(stdoutChunks).toString("utf-8");

      if (code === 0) {
        let output = rawOutput;
        if (maxLines && rawOutput.includes("\n")) {
          const lines = rawOutput.split("\n");
          if (lines.length > maxLines) {
            output = lines.slice(0, maxLines).join("\n");
            output += `\n\n[... output capped at ${maxLines} lines, ${lines.length - maxLines} more lines truncated]`;
          }
        }
        const suffix = outputTruncated
          ? killedEarly
            ? " [output capped - command was still producing data]"
            : ""
          : "";
        resolve({
          role: "tool",
          tool_call_id: toolCall.id,
          content: (output || "(no output)") + suffix,
        });
      } else {
        resolve({
          role: "tool",
          tool_call_id: toolCall.id,
          content: `Error: ${stderr.trim() || `command exited with code ${code}`}`,
        });
      }
    });
  });
}
