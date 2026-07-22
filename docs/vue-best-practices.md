---
title: "Vue Best Practices"
tags: [vue, best-practices, frontend, composition-api, pinia]
topics: [style-guidelines, architecture, reactivity, state-management, performance, testing]
keywords: [vue, best-practices, component-naming, scoped-styles, script-setup, pinia, vitest, playwright]
summary: "Rules for writing and structuring Vue 3 applications in 2026. Covers style guidelines, component naming, architecture, reactivity, state management, performance, and testing."
llm_hints: "Target audience: frontend developers building Vue 3 applications. Covers component conventions, architecture patterns, and modern Vue tooling as of 2026."
---

# Vue Best Practices (2026)

Rules for writing and structuring Vue 3 applications. Covers style guidelines, architecture, reactivity patterns, state management, performance, and testing.

---


## Table of Contents

- [1. Style Guidelines](#1-style-guidelines)
- [2. Architecture & Organization](#2-architecture--organization)
- [3. Reactivity](#3-reactivity)
- [4. State Management](#4-state-management)
- [5. Performance](#5-performance)
- [6. Testing](#6-testing)
- [7. Patterns to Avoid](#7-patterns-to-avoid)

---


## 1. Style Guidelines

This section covers component files, naming conventions, templates, styling, SFC structure, and directive usage.

### 1.1 Component Files

- **One component per file**: Each component should be its own `.vue` file.
- **Filename casing**: Always PascalCase or always kebab-case (PascalCase preferred for editor autocompletion).

### 1.2 Component Names

- **Multi-word names**: All component names must be multi-word (e.g., `TodoItem`, not `Item`), except root `App` component.
- **Base component prefix**: Base/presentational components should start with `Base`, `App`, or `V` (e.g., `BaseButton`, `AppModal`).
- **Tight coupling prefix**: Child components tightly coupled to a parent should be prefixed (e.g., `TodoListItem`, `SearchSidebarNavigation`).
- **Word order**: Highest-level (most general) words first, descriptive modifier words last (e.g., `SearchButtonClear`, not `ClearSearchButton`).

### 1.3 Templates

- **PascalCase in SFCs/strings**: Use PascalCase for components in Single-File Components and string templates (`<TodoItem />`). Use kebab-case in in-DOM templates (`<todo-item></todo-item>`).
- **Self-closing components**: Self-close components with no content in SFCs and string templates (`<MyComponent />`). Never self-close in in-DOM templates.
- **Attribute order**: Definition (`is`) → List Rendering (`v-for`) → Conditionals (`v-if`/`v-else`) → Render Modifiers (`v-pre`, `v-once`) → Global Awareness (`id`) → Unique (`ref`, `key`) → Two-Way Binding (`v-model`) → Other Attributes → Events (`v-on`) → Content (`v-html`, `v-text`).
- **Detailed prop definitions**: Always specify at least the type in prop definitions. Add `required`, `default`, and `validator` where appropriate.

### 1.4 Styling

- **Scoped styles**: All components except top-level `App` and layout components should use scoped styles (via `<style scoped>`, CSS modules, or BEM convention).

### 1.5 SFC Structure

- **Tag order**: Consistently order `<script>`, `<template>`, `<style>` — `<style>` last. Recommended: `<script>` → `<template>` → `<style>`.
- **Options order**: `name` → `compilerOptions` → template deps (`components`, `directives`) → `extends`/`mixins`/`provide/inject` → `inheritAttrs` → `props` → `emits`/`expose` → `setup` → local state → `computed` → `methods` → `watch` → lifecycle hooks → non-reactive properties → `template`/`render`.
- **Empty lines**: Add blank lines between multi-line options for readability when needed.

### 1.6 Directive Usage

- **`v-for` keys**: Required `:key` on all components; good practice on all elements for predictable rendering and animations.
- **`v-if` + `v-for`**: Never use both on the same element. Use a computed property for filtering, or wrap in a `<template>` with `v-for`.

---


## 2. Architecture & Organization

This section covers directory structure and shared system patterns.

- **Domain-Driven Structure**: Organize by feature/business domain (e.g., `UserBilling`, `ProjectBoard`) rather than technical type (`components/`, `stores/`, `composables/`). Shared UI components go in a separate `shared/ui` folder, core logic in `core/`.
- **Layers for Shared Systems**: For organizations with multiple Vue apps, use Nuxt Layers to share design systems and utility logic across projects.

---


## 3. Reactivity

This section covers the Composition API, reactivity choices for large data, and effect scope management.

- **`<script setup>` as Standard**: Use Composition API with `<script setup>`. Options API is legacy and harder for compiler optimizations.
- **Shallow Reactivity for Large Data**: Use `shallowRef()` for large, immutable data structures instead of `ref()` or `reactive()` — reduces memory by ~40% in data-heavy apps.
- **Effect Scope Management**: Use `effectScope()` to group and dispose of reactive effects, preventing "zombie" watchers after component unmount.

---


## 4. State Management

This section covers global state (Pinia) and local/shared state patterns.

- **Pinia over Vuex**: Pinia is the default for global state (auth, themes, etc.). Vuex is deprecated.
- **Composables for Local State**: For branch-level or shared local state, use composables with singleton state outside the function to avoid cluttering global stores.

---


## 5. Performance

This section covers prop stability patterns and optimization directives.

- **Prop Stability (Active-Item Pattern)**: Pass primitives instead of full objects as props. Pass only what the child needs to re-render.
- **Optimization Directives**: Use `v-once` for static content, `v-memo` for long `v-for` lists to skip unnecessary re-renders.

---


## 6. Testing

This section covers unit testing, E2E testing, and test locator strategies.

- **Vitest for Logic**: Unit test composables and stores.
- **Playwright for E2E**: Test user journeys ("happy paths"), not individual UI elements.
- **Stable Locators**: Use `data-testid` or ARIA roles instead of CSS selectors to make tests resilient to UI changes.

---


## 7. Patterns to Avoid

This section covers legacy patterns and tools that should not be used in new development.

- Vuex, Filters (removed in Vue 3), Event buses, Global mixins, Options API in new development.
- Webpack/Vue CLI (deprecated — use Vite).
