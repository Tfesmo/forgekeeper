import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const SETTINGS_DIR_NAME = ".forgekeeper";
const SETTINGS_FILE_NAME = "settings.json";
const DEFAULT_ROLE = "You are a software engineer and competent technical document writer.";

export async function getSettingsDir() {
  const home = os.homedir();
  const dir = path.join(home, SETTINGS_DIR_NAME);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
  return dir;
}

export async function loadSettings() {
  const dir = await getSettingsDir();
  const filePath = path.join(dir, SETTINGS_FILE_NAME);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return { role: DEFAULT_ROLE };
  }
}

export async function saveSettings(settings) {
  const dir = await getSettingsDir();
  const filePath = path.join(dir, SETTINGS_FILE_NAME);
  await fs.writeFile(filePath, JSON.stringify(settings, null, 2));
}
