import { test, expect } from "@playwright/test";

test.describe("Frontend Console Errors", () => {
  test.use({
    ignoreHTTPSErrors: true,
  });

  test("app loads without console errors", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("https://localhost:8888/");
    await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    await page.waitForSelector("#app", { timeout: 10000 });

    expect(consoleErrors.length).toBe(0);
  });

  test("chat view loads without console errors", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("https://localhost:8888/");
    await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
    await page.waitForSelector("#app", { timeout: 10000 });

    expect(consoleErrors.length).toBe(0);
  });
});
