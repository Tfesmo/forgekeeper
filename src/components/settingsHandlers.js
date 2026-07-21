import * as inquirer from "@inquirer/prompts";

import { loadSettings, saveSettings } from "../settings.js";

/**
 * Opens an inquirer prompt to edit system prompt role.
 * Loads existing settings, prompts for new role, and saves.
 * Sets isInquirer to true before and after the prompt completes.
 * Updates currentRole and triggers onRoleToggle callback.
 */
export async function handleSettings(setIsInquirer, setCurrentRole, onRoleToggle) {
  setIsInquirer(true);
  const settings = await loadSettings();

  const role = await inquirer.input({
    message: "System prompt role",
    default: settings.role,
  });

  await saveSettings({ ...settings, role });
  setCurrentRole(role);
  if (onRoleToggle) {
    onRoleToggle(role);
  }
  setIsInquirer(false);
}
