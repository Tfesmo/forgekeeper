import React from "react";
import { Box, Text } from "ink";

import { getRoleConfig } from "../config/ui.js";
import { getMessageLabel } from "./chatHelpers.js";

/**
 * Renders a list of messages, filtering out system messages.
 * Each message displays its role label (with color) and text content.
 */
export function MessageList({ messages, currentRole }) {
  return messages
    .filter((msg) => msg.role !== "system")
    .map((msg, i) => {
      const roleConfig = getMessageLabel(msg.role, currentRole);
      return (
        <Box key={i} flexDirection="column">
          <Text bold color={roleConfig.color}>
            {roleConfig.symbol} {roleConfig.label}:
          </Text>
          <Text>{msg.text}</Text>
        </Box>
      );
    });
}

/**
 * Renders a "Thinking..." indicator with the current agent role.
 */
export function LoadingIndicator({ currentRole }) {
  const aiConfig = getRoleConfig(currentRole);
  return (
    <Box flexDirection="column">
      <Text bold color={aiConfig.color}>
        {aiConfig.symbol} {aiConfig.label}:
      </Text>
      <Text>Thinking...</Text>
    </Box>
  );
}

/**
 * Renders a welcome message when there are no messages and not loading.
 */
export function EmptyState() {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Text>Forgekeeper ready.</Text>
      <Text dimColor> Type a message or press Tab for commands. Escape clears input.</Text>
    </Box>
  );
}
