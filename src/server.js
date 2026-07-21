import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const VUE_ASSETS_DIR = path.join(__dirname, "components", "vue");
const API_BASE = "http://127.0.0.1:8080";
const MODEL = "qwen";
const MAX_TOKENS = 4096;
const port = Number(process.env.PORT ?? 8888);
process.env.USE_HTTPS = process.env.USE_HTTPS || "1";

const app = express();

app.use(express.json());

app.use("/vue-assets", express.static(VUE_ASSETS_DIR));

// In-memory conversation store keyed by sessionId
const conversations = new Map();

app.get("/", (_, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Forgekeeper</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body, #app { height: 100%; width: 100%; }
        </style>
    </head>
    <body>
        <div id="app"></div>
        <script type="module">
            import { createApp, ref, onMounted, computed } from "https://cdn.jsdelivr.net/npm/vue@3/dist/vue.esm-browser.js";

            const MessageHistory = {
                name: "MessageHistory",
                props: {
                    messages: { type: Array, required: true },
                    currentRole: { type: String, default: "implementer" },
                },
                setup(props) {
                    const filteredMessages = computed(
                        () => props.messages.filter((msg) => msg.role !== "system")
                    );
                    const roleMap = {
                        user: { symbol: "\u25c6", color: "white", label: "You" },
                        advisor: { symbol: "\u2728", color: "yellow", label: "Advisor" },
                        architect: { symbol: "\u2699", color: "cyan", label: "Architect" },
                        implementer: { symbol: "\u270d", color: "green", label: "Implementer" },
                        reviewer: { symbol: "\u2714", color: "magenta", label: "Reviewer" },
                        analyst: { symbol: "\u24c8", color: "blue", label: "Analyst" },
                    };
                    function getMessageLabelData(role) {
                        if (role === "user") return roleMap.user;
                        if (role === "assistant") return roleMap[props.currentRole] || roleMap.implementer;
                        return roleMap[role] || { symbol: "", color: "white", label: role };
                    }
                    return { filteredMessages, getMessageLabelData };
                },
                template: \`
                    <div class="message-history">
                        <div
                            v-for="(msg, index) in filteredMessages"
                            :key="index"
                            class="message-item"
                        >
                            <div class="message-header" :style="{ color: getMessageLabelData(msg.role).color }">
                                <span class="message-symbol">{{ getMessageLabelData(msg.role).symbol }}</span>
                                <span class="message-label">{{ getMessageLabelData(msg.role).label }}:</span>
                            </div>
                            <div class="message-content">{{ msg.text }}</div>
                        </div>
                        <div v-if="filteredMessages.length === 0" class="empty-state">
                            <p>Forgekeeper ready.</p>
                            <p class="dim">Type a message to begin.</p>
                        </div>
                    </div>
                \`,
            };

            const UserPrompt = {
                name: "UserPrompt",
                emits: ["submit"],
                setup(_, { emit }) {
                    const promptText = ref("");
                    function handleSubmit() {
                        if (promptText.value.trim()) {
                            emit("submit", promptText.value.trim());
                            promptText.value = "";
                        }
                    }
                    function handleKeydown(e) {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }
                    return { promptText, handleSubmit, handleKeydown };
                },
                template: \`
                    <div class="user-prompt">
                        <form class="prompt-form" @submit.prevent="handleSubmit">
                            <input
                                v-model="promptText"
                                type="text"
                                class="prompt-input"
                                placeholder="Enter your message..."
                                @keydown="handleKeydown"
                            />
                            <button
                                type="submit"
                                class="submit-button"
                                :disabled="!promptText.trim()"
                            >
                                Send
                            </button>
                        </form>
                    </div>
                \`,
            };

            const ChatView = {
                name: "ChatView",
                components: { MessageHistory, UserPrompt },
                setup() {
                    const messages = ref([]);
                    const currentRole = ref("implementer");
                    const isLoading = ref(false);
                    const error = ref(null);

                    function handlePolling() {
                        fetch("/api/chat-status")
                            .then((res) => res.json())
                            .then((data) => {
                                if (data.messages && data.messages.length > 0) {
                                    messages.value = data.messages;
                                }
                                if (data.error) {
                                    error.value = data.error;
                                }
                                if (data.done) {
                                    isLoading.value = false;
                                }
                            })
                            .catch(() => {
                                isLoading.value = false;
                            });
                    }

                    async function sendMessage(text) {
                        error.value = null;

                        // Optimistically add the user message
                        messages.value = [...messages.value, { role: "user", text }];
                        isLoading.value = true;

                        try {
                            await fetch("/api/chat", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    messages: messages.value,
                                    role: currentRole.value,
                                }),
                            });
                        } catch (err) {
                            error.value = err.message;
                        }
                    }

                    onMounted(() => {
                        setInterval(handlePolling, 2000);
                    });

                    return { messages, currentRole, isLoading, error, sendMessage };
                },
                template: \`
                    <div class="chat-view">
                        <div class="chat-header">
                            <h1 class="app-title">Forgekeeper</h1>
                        </div>
                        <MessageHistory
                            :messages="messages"
                            :current-role="currentRole"
                        />
                        <div v-if="error" class="error-message">{{ error }}</div>
                        <UserPrompt @submit="sendMessage" />
                    </div>
                \`,
            };

            const app = createApp(ChatView);
            app.mount("#app");
        </script>
    </body>
    </html>
    `);
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, role } = req.body;

    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: "No messages provided" });
    }

    const sessionId = "default";
    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, {
        messages: messages.map((msg) => ({ role: msg.role, text: msg.text })),
        done: false,
        error: null,
        role,
      });
    }

    const conv = conversations.get(sessionId);
    conv.messages = messages.map((msg) => ({ role: msg.role, text: msg.text }));
    conv.role = role;

    // Kick off async LLM call
    (async () => {
      try {
        const systemPrompt = `You are an expert software engineer and competent technical writer. Available roles: advisor, architect, implementer, reviewer, analyst. You are currently acting as: ${role}.`;
        const apiMessages = [
          { role: "system", content: systemPrompt },
          ...messages.map((msg) => ({ role: msg.role, content: msg.text })),
        ];

        const response = await fetch(`${API_BASE}/v1/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: MODEL,
            messages: apiMessages,
            max_tokens: MAX_TOKENS,
            top_p: 1,
          }),
          signal: AbortSignal.timeout(120_000),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          conv.error = `API error: ${response.status} - ${errorBody}`;
        } else {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || "[No response]";
          conv.messages = [
            ...messages.map((msg) => ({ role: msg.role, text: msg.text })),
            { role: "assistant", text: content },
          ];
          conv.done = true;
        }
      } catch (err) {
        conv.error = err.message;
      }
    })();

    res.json({ accepted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/chat-status", (_, res) => {
  const sessionId = "default";
  const conv = conversations.get(sessionId);
  if (!conv) {
    return res.json({ messages: [], done: true });
  }
  res.json({
    messages: conv.messages,
    done: conv.done,
    error: conv.error,
  });
});

function startServer(protocol) {
  const server = protocol
    ? https
        .createServer(
          {
            key: fs.readFileSync(path.join(__dirname, "..", "certs", "key.pem")),
            cert: fs.readFileSync(path.join(__dirname, "..", "certs", "cert.pem")),
          },
          app,
        )
        .listen(port, "0.0.0.0", () => {
          console.log(`Listening on https://0.0.0.0:${port}`);
        })
    : app.listen(port, "0.0.0.0", () => {
        console.log(`Listening on http://0.0.0.0:${port}`);
      });

  return server;
}

const server = startServer(process.env.USE_HTTPS);
if (!server) {
  console.error("Failed to start server — check certs/cert.pem and certs/key.pem");
}
