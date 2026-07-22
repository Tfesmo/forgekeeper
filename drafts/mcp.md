# Node.js Tools & MCP Libraries — Research Notes

## 1. `@modelcontextprotocol/server` (Official MCP TypeScript SDK)

| Criteria | Rating | Notes |
|---|---|---|
| **Maturity** | ⭐⭐⭐⭐⭐ | Official SDK by Anthropic; v1 is stable, v2 in beta implementing 2026-07-28 spec |
| **Stars (GitHub)** | ~12.9k | Highest community adoption |
| **Type Safety** | ⭐⭐⭐⭐⭐ | Full TypeScript, Standard Schema support (Zod v4, Valibot, ArkType) |
| **Flexibility** | ⭐⭐⭐⭐⭐ | Lowest-level primitives — you build everything yourself |
| **Transports** | stdio, Streamable HTTP, SSE | Full coverage |
| **Auth** | OAuth helpers included | Built-in OAuth support |
| **Middleware** | Express, Hono, Node.js HTTP | Thin adapter packages |
| **Best for** | Maximum control, custom architectures | When you need full control over every detail |

## 2. `fastmcp`

| Criteria | Rating | Notes |
|---|---|---|
| **Maturity** | ⭐⭐⭐⭐ | v4.3.2, actively maintained (9 days ago) |
| **Stars (GitHub)** | ~3.2k | Strong community adoption |
| **Type Safety** | ⭐⭐⭐⭐⭐ | Standard Schema support, Zod/ArkType/Valibot |
| **Developer Experience** | ⭐⭐⭐⭐⭐ | Batteries-included framework, opinionated |
| **Features** | ⭐⭐⭐⭐⭐ | Sessions, streaming, auth, HTTPS, edge runtime, CLI, elicitation, progress, sampling, roots management |
| **Transports** | stdio, HTTP Stream, SSE, Edge | Most transport coverage |
| **Built on** | Official MCP SDK | Higher-level wrapper |
| **Best for** | Rapid MCP server development | When you want to build fast without boilerplate |

## 3. `mcp-framework` (QuantGeekDev)

| Criteria | Rating | Notes |
|---|---|---|
| **Maturity** | ⭐⭐⭐ | v0.2.22, actively maintained |
| **Stars (GitHub)** | ~930 | Smaller but growing |
| **Type Safety** | ⭐⭐⭐⭐ | Zod-based schemas with auto type inference |
| **Architecture** | ⭐⭐⭐⭐⭐ | Class-based, directory-based discovery |
| **CLI** | ⭐⭐⭐⭐ | `mcp create`, `mcp add`, `mcp validate` |
| **Auth** | ⭐⭐⭐⭐ | JWT, API Key, OAuth 2.1 (intensive documentation) |
| **Build validation** | ⭐⭐⭐⭐ | Enforces field descriptions at build time |
| **Transports** | stdio, SSE, HTTP Stream | Good coverage |
| **Best for** | Large MCP projects needing structure | When you want architecture out of the box with file discovery |

## 4. `ai` (Vercel AI SDK)

| Criteria | Rating | Notes |
|---|---|---|
| **Maturity** | ⭐⭐⭐⭐⭐ | v7.0.29, extremely active (17 hours ago) |
| **npm dependents** | ~4,751 projects | Largest ecosystem |
| **Focus** | Tool calling + LLM interactions | Not MCP-specific |
| **Model support** | OpenAI, Anthropic, Google, etc. | Multi-model abstraction |
| **Streaming** | ⭐⭐⭐⭐⭐ | Full streaming support built-in |
| **Node.js** | ✅ First-class | Node.js Quickstart available |
| **MCP integration** | Via `@anthropic/mcp` client | MCP client support exists |
| **Best for** | Building LLM-powered apps with tool calling | When you need multi-model support beyond MCP |

## 5. `langchain` (LangChain.js)

| Criteria | Rating | Notes |
|---|---|---|
| **Maturity** | ⭐⭐⭐⭐⭐ | Well-established framework |
| **Focus** | LLM chains, agents, tool calling | Full LLM application framework |
| **Tool calling** | `create_agent()` | Agent-based tool orchestration |
| **Integrations** | ⭐⭐⭐⭐⭐ | Massive ecosystem of model providers, vector stores, etc. |
| **MCP integration** | Indirect | Can connect via MCP clients |
| **Best for** | Complex agent workflows | When you need full chain/agent orchestration |

## 6. `openai` (OpenAI Node.js SDK)

| Criteria | Rating | Notes |
|---|---|---|
| **Maturity** | ⭐⭐⭐⭐⭐ | v6.45.0, very active (5 days ago) |
| **npm dependents** | ~11,734 projects | Largest npm footprint |
| **Tool calling** | `runTools()` helper | Automated tool execution |
| **MCP integration** | ❌ None | No MCP-specific features |
| **Best for** | OpenAI-specific integrations | When you only need OpenAI API access |

## 7. `@hono/mcp`

| Criteria | Rating | Notes |
|---|---|---|
| **Maturity** | ⭐⭐⭐ | v0.2.5, moderately maintained |
| **Focus** | HTTP middleware for MCP on Hono | Thin adapter |
| **Best for** | Projects already using Hono | When you want MCP over Hono framework |

---

## Ranking Summary

| Rank | Library | Best Use Case |
|---|---|---|
| 1 | **@modelcontextprotocol/server** | Official, maximum control, production MCP servers |
| 2 | **fastmcp** | Rapid development, batteries-included MCP servers |
| 3 | **mcp-framework** | Structured MCP projects with CLI tooling |
| 4 | **ai (Vercel)** | Multi-model tool calling, not MCP-specific |
| 5 | **langchain** | Full agent/chain orchestration |
| 6 | **openai** | OpenAI-only tool calling |
| 7 | **@hono/mcp** | MCP over Hono (niche) |

## Recommendations

- **For writing MCP servers:** `@modelcontextprotocol/server` for control, `fastmcp` for speed
- **For tool calling (non-MCP):** `ai` (Vercel) for multi-model, `openai` for OpenAI-only
- **For full agent workflows:** `langchain` for comprehensive orchestration
- **For MCP + Hono:** `@hono/mcp`

---

## Source Links

- [MCP TypeScript SDK (Official)](https://github.com/modelcontextprotocol/typescript-sdk)
- [FastMCP](https://github.com/punkpeye/fastmcp)
- [MCP Framework (QuantGeekDev)](https://github.com/QuantGeekDev/mcp-framework)
- [Vercel AI SDK](https://vercel.com/ai-sdk)
- [LangChain.js](https://www.npmjs.com/package/langchain)
- [OpenAI Node.js SDK](https://www.npmjs.com/package/openai)
- [@hono/mcp](https://www.npmjs.com/package/@hono/mcp)
