import { test, expect } from "@playwright/test";

test.describe("Chat Submission", () => {
  test.use({
    ignoreHTTPSErrors: true,
  });

  test("user can submit a message and receive a streamed response", async ({
    page,
  }) => {
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Mock the EventSource to simulate SSE events for session streams only
    await page.addInitScript(() => {
      const OriginalEventSource = window.EventSource;

      class SessionStreamMock {
        constructor(url) {
          // Check if this looks like a session stream
          if (!url.includes("/api/session/") || !url.includes("/stream")) {
            // Not a session stream — use original
            this._real = new OriginalEventSource(url);
            return;
          }

          this.url = url;
          this.handlers = {};

          // Simulate an LLM response
          setTimeout(() => {
            if (this.handlers["llm-chunk"]) {
              this.handlers["llm-chunk"]({
                data: JSON.stringify({ seq: 1, content: "Hello" }),
              });
              this.handlers["llm-chunk"]({
                data: JSON.stringify({ seq: 2, content: " world" }),
              });
            }
            if (this.handlers["llm-done"]) {
              this.handlers["llm-done"]({
                data: JSON.stringify({ seq: 3, message: { forgekeeper: {} } }),
              });
            }
          }, 10);
        }

        addEventListener(event, handler) {
          if (this._real) {
            this._real.addEventListener(event, handler);
          } else {
            this.handlers[event] = handler;
          }
        }

        close() {
          if (this._real) {
            this._real.close();
          }
        }
      }

      // Replace EventSource globally — SessionStreamMock delegates to original for non-stream URLs
      window.EventSource = SessionStreamMock;
    });

    // Mock REST API calls
    const sessionCreated = test.step(
      "mock session creation API",
      async () => {
        let resolve;
        const promise = new Promise((r) => (resolve = r));

        await page.route("**/api/session/new", (route) => {
          route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ id: "mock-session-123" }),
          });
          resolve();
        });

        return promise;
      }
    );

    await page.goto("https://localhost:8888/");
    await page.waitForSelector("#app", { timeout: 10000 });

    // Wait for the session creation API call
    await sessionCreated;

    // Type a message and submit
    const input = page.locator("textarea.prompt-input");
    await input.fill("Hello, this is a test message");

    // Submit by clicking the send button
    const sendBtn = page.locator("button.submit-button");
    await expect(sendBtn).toBeEnabled();
    await sendBtn.click();

    // Wait for at least one message item to appear
    await expect(page.locator(".message-item").first()).toBeVisible({ timeout: 10000 });

    // Wait for streamed assistant content to appear
    await page.waitForFunction(() => {
      const messageContents = document.querySelectorAll(".message-content");
      for (const el of messageContents) {
        if (el.textContent.includes("Hello world")) {
          return true;
        }
      }
      return false;
    }, { timeout: 10000 });

    // Verify no console errors occurred
    expect(consoleErrors.length).toBe(0);

    // Verify both messages exist with expected content
    const messageContents = page.locator(".message-content");
    await expect(messageContents.first()).toContainText("Hello, this is a test message");

    const lastContent = page.locator(".message-content").last();
    await expect(lastContent).toContainText("Hello world");
  });
});
