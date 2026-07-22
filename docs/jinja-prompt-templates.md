# Jinja Prompt Templates

This document describes how Jinja2 templates are used to construct prompts before they are serialized into the messages array (see [Messages Contract](./messages-contract.md)).

## Purpose

Jinja2 provides a programmatic templating layer between static prompt content and the dynamic messages sent to the LLM. Key reasons:

- **Separation of concerns**: Prompt text lives in `.jinja` files, not in JS source code.
- **Dynamic content injection**: Variables, loops, and conditionals let you build prompts from conversation state, user info, or retrieved data without string concatenation in application code.
- **Reusability**: A single template can be rendered with different contexts (user session data, chat history, retrieved documents).

## Template Structure

A typical Jinja prompt template follows this structure:

```jinja
{{ system_message }}

{% for message in chat_history %}
<message role="{{ message.role }}">{{ message.content }}</message>
{% endfor %}

{{ user_query }}
```

### Variable substitution

- `{{ variable_name }}` — inserts the value of a context variable.
- Use `{{ variable_name | default('') }}` for optional fields to avoid undefined errors.

### Control structures

- `{% for item in items %} ... {% endfor %}` — iterate over chat history, retrieved documents, etc.
- `{% if condition %} ... {% endif %}` — conditional prompt sections (e.g., include tool definitions only when tools are available).
- `{% set var = value %}` — define intermediate variables within the template.

### Filters

- `{{ value | trim }}` — strip whitespace.
- `{{ value | default('N/A') }}` — provide fallback values.
- `{{ value | e }}` — HTML-escape (useful when content will be embedded in XML-like wrappers).

## Two-Stage Processing

Some implementations use a two-stage rendering pipeline:

1. **Stage 1** — Render the main Jinja template with a context dictionary (variables from `user_defined_context`).
2. **Stage 2** — An optional `preprocess_prompt_template` hook receives the Stage 1 output and can inject additional dynamic content (e.g., loading external JSON data, performing further Jinja2 rendering, or transforming the string).

This pattern is useful when certain data (like retrieved documents or conversation context) is only available at runtime and cannot be statically included in the context dictionary.

## Integration with Messages Contract

Jinja templates produce a single prompt string. This string is then split into the `messages` array per the rules in [Messages Contract](./messages-contract.md):

- The system prompt portion becomes the single `"system"` message.
- Chat history entries from `{% for %}` loops become individual `"user"` and `"assistant"` messages.
- The final user query becomes the last `"user"` message.

## Guarded files

Before modifying Jinja templates, review:

- `src/services/llmService.js` — template loading and rendering logic
- Any `.jinja` template files in the templates directory

## Best Practices

1. **Keep templates in `.jinja` files**, not inline in JS strings.
2. **Validate context variables** before rendering — missing keys cause Jinja errors.
3. **Use `default()` filters** for optional fields.
4. **Avoid embedding sensitive data** in templates or their rendered output.
5. **Test templates independently** — render them with sample context before integrating with the LLM service.
6. **Version your prompts** — track changes in Git alongside code changes.
