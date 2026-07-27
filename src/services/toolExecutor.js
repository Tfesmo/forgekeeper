import { executeCommandTool } from "../tools/executor.js";
import { loadToolsConfig } from "../tools/registry.js";

/**
 * Executes registered tools based on tool_calls from the LLM.
 * Supports both command-based tools (from tools.json) and handler-based tools.
 * Returns an array of tool result messages compatible with the OpenAI API format.
 */
export async function executeToolCalls(toolCalls, toolsConfig) {
  console.log("[tools] executeToolCalls invoked with", toolCalls.length, "tool call(s)");

  // If no custom handlers passed, fall back to command-based execution from config
  const config = toolsConfig || {};
  const commandTools = loadToolsConfig().tools;

  const results = [];

  for (const tc of toolCalls) {
    const toolName = tc.function?.name;

    let args;
    try {
      args = JSON.parse(tc.function?.arguments || "{}");
    } catch {
      args = {};
    }

    console.log("[tools] calling:", toolName, "with args:", JSON.stringify(args));

    let toolResult;

    // Check if it's a command-based tool
    if (commandTools[toolName]) {
      try {
        toolResult = await executeCommandTool(tc, commandTools[toolName]);
        console.log(
          "[tools] result from",
          toolName,
          ":",
          typeof toolResult.content === "string"
            ? toolResult.content.slice(0, 200)
            : toolResult.content,
        );
      } catch (err) {
        console.error("[tools] error from", toolName, ":", err.message);
        const truncated = tc.function?.arguments?.length < 20 ? " (possible truncation)" : "";
        toolResult = {
          role: "tool",
          tool_call_id: tc.id,
          content: `Error: ${err.message}${truncated}`,
        };
      }
    }
    // Otherwise use the provided handler config
    else {
      const handler = config?.[toolName];
      if (!handler) {
        const availableTools = Object.keys(commandTools).join(", ");
        console.warn("[tools] unknown tool:", toolName, "available:", availableTools);
        toolResult = {
          role: "tool",
          tool_call_id: tc.id,
          content: `Error: tool "${toolName}" is not registered. Available tools: ${availableTools}`,
        };
      } else {
        try {
          const result = await handler(args);
          console.log(
            "[tools] result from",
            toolName,
            ":",
            typeof result === "string" ? result.slice(0, 200) : result,
          );
          toolResult = {
            role: "tool",
            tool_call_id: tc.id,
            content: typeof result === "string" ? result : JSON.stringify(result),
          };
        } catch (err) {
          console.error("[tools] error from", toolName, ":", err.message);
          toolResult = {
            role: "tool",
            tool_call_id: tc.id,
            content: `Error: ${err.message}`,
          };
        }
      }
    }

    results.push(toolResult);
  }

  return results;
}
