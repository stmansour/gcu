# AGENTS.md

## Project Overview

This repository contains code for **Grandpa's Creative Universe (GCU)**, a collection of interactive educational games for children.

The architecture is based on a **shared core engine** plus individual games/modules.

Current and planned modules include:

- Robot Lab
- Puzzle Forest
- other future games inside the GCU world

The project targets:

- **iPad first**
- **iPhone second**
- touch-first interactions
- child-friendly visuals
- lightweight app architecture suitable for packaging and deployment as **standalone iOS apps**

This codebase may use web technologies internally (JavaScript, CSS, HTML), but the intended product is **not merely a website**. The intended product is a **real standalone application experience on iPad/iPhone**, suitable for running through Apple’s app ecosystem.

---

## Primary Development Goals

When making changes in this repo, prioritize the following:

1. **Do not break existing games**
2. **Favor reusable engine code**
3. **Keep interactions simple and tactile**
4. **Optimize for touch devices**
5. **Keep performance smooth**
6. **Preserve compatibility with standalone mobile app packaging**
7. **Prefer modular, readable JavaScript**
8. **Do not introduce unnecessary frameworks**

---

## Tech / Architectural Constraints

### Core Stack
- JavaScript
- CSS
- HTML
- JSON for data-driven content

### Packaging / Runtime Intent
- The implementation may use web technologies internally
- The resulting product must remain suitable for packaging as a **standalone iPad/iPhone app**
- Avoid patterns that assume continuous browser connectivity
- Avoid patterns that assume desktop browser usage
- Favor architecture that works cleanly inside an embedded webview / app shell if needed

### General Constraints
- Keep dependencies light
- Avoid introducing large frameworks unless explicitly requested
- Prefer code that fits naturally into the existing GCU engine structure
- Reuse existing engine systems when possible
- Add new modules only when they are clearly reusable

### Device Priorities
- Design for iPad first
- Support iPhone second
- Assume touch interaction, not mouse hover
- Touch targets must be large and forgiving
- Consider portrait/landscape behavior explicitly where relevant

---

## Project Philosophy

This project is meant to feel:

- playful
- warm
- inviting
- emotionally safe
- rewarding for children

It should **not** feel like school, testing, enterprise software, or a generic browser app.

Children should feel like they are:

- helping
- building
- dragging
- placing
- experimenting
- discovering

Mistakes should be gentle, visible, and often fun.

---

## Interaction Design Rules

All new interaction code should follow these principles:

### Touch First
- interactions must work well on touch devices
- avoid reliance on hover
- use large interactive targets
- make dragging smooth and forgiving

### Immediate Feedback
- every important interaction should produce visible feedback
- successful actions should feel rewarding
- incorrect actions should feel gentle, not punishing

### Magnetic Snap
- whenever appropriate, dragged objects should snap into targets
- avoid requiring pixel-perfect placement

### Short Loops
- interactions for young children should resolve quickly
- avoid long delays before feedback

---

## Mobile App Requirements

Because this project is intended to become standalone iPad/iPhone apps, code should respect these requirements:

- do not assume a desktop browser environment
- do not rely on hover, right-click, or keyboard-only workflows
- avoid dependencies on browser chrome or browser navigation UI
- avoid fragile assumptions about window sizing
- prefer asset loading and runtime behavior that can work locally within an app bundle
- favor deterministic startup behavior
- minimize dependency on remote services unless explicitly designed for them

---

## Game-Specific Notes

### Robot Lab
Robot Lab teaches engineering concepts through visual experimentation.

Important principles:
- show consequences visually
- emphasize intuition before explanation
- mistakes are part of learning
- simulations may be qualitative rather than physically exact

Do not “improve” Robot Lab by turning it into a dense engineering tool unless explicitly requested.

### Puzzle Forest
Puzzle Forest is intended for very young children (approximately ages 2–4).

Important principles:
- no reading required
- spoken prompts
- drag-and-drop preferred over simple tapping
- large touch targets
- very short puzzle cycles
- bright, clear visual structure
- reusable puzzle mechanics

Puzzle Forest should be built from reusable systems such as:
- drag manager
- snap manager
- puzzle manager
- reward system
- audio prompt system

---

## Data-Driven Content

Whenever practical, content should be driven by JSON or similarly simple data definitions.

Examples:
- puzzle definitions
- object/target mappings
- prompt associations
- reward types

The goal is to make it easy to add new content without rewriting core logic.

---

## Performance Expectations

- Keep animations lightweight
- Prefer smooth rendering over visual complexity
- Target responsive interaction on iPad and iPhone
- Avoid unnecessary DOM churn
- Avoid heavy runtime dependencies
- Keep startup time reasonable for a standalone mobile app
- Be mindful of memory usage on mobile devices

---

## File and Module Guidelines

When creating new code:

- place game-specific code under the appropriate game directory
- place reusable logic in shared/core locations only when genuinely reusable
- do not duplicate engine logic if a shared version can be created cleanly
- avoid creating giant catch-all files

When editing code:

- preserve existing public interfaces unless explicitly asked to change them
- avoid broad renames
- avoid moving files unless there is a strong reason

---

## How to Work on Tasks

When asked to implement something:

1. Understand the requested feature
2. Inspect nearby code before changing anything
3. Reuse existing patterns where practical
4. Implement the smallest working version first
5. Keep the design extensible
6. Avoid speculative overengineering
7. Preserve suitability for standalone mobile app deployment

When uncertain:
- make the conservative choice
- preserve compatibility
- prefer minimal surface-area changes

---

## What to Avoid

Do not:

- introduce React, Vue, or large frameworks unless explicitly requested
- replace working code with a new architecture without approval
- overcomplicate simple interactions
- optimize prematurely in ways that make the code harder to understand
- add keyboard/mouse-first assumptions to toddler-facing gameplay
- make puzzle interactions dependent on reading
- assume the final target is just a desktop browser
- introduce patterns that make standalone iOS app packaging harder

---

## Output Expectations for Agent Work

When implementing code, prefer to:

- create clean, working modules
- keep diffs focused
- name files clearly
- leave TODOs only when necessary
- make partial progress cleanly if the full task is large

If a requested feature depends on missing assets or unclear engine hooks:
- implement the code structure first
- clearly mark the integration points
- do not invent large unrelated systems

---

## Recommended Agent Behavior

Before writing code:
- inspect relevant files
- understand existing patterns
- avoid assumptions about architecture

When writing code:
- preserve style consistency
- write for maintainability
- think in reusable interaction patterns
- keep standalone mobile deployment in mind

After writing code:
- sanity-check for obvious breakage
- ensure touch interactions remain intuitive
- confirm the code matches the requested feature
- avoid introducing browser-only assumptions

---

## Priority Order

When tradeoffs arise, prioritize in this order:

1. Correctness
2. Preserving existing behavior
3. Touch usability
4. Standalone mobile app suitability
5. Simplicity
6. Reusability
7. Visual polish

---

## Summary

This repo is building a shared educational game universe for children.

Agent contributions should be:
- careful
- modular
- touch-friendly
- child-centered
- consistent with the existing architecture
- compatible with eventual standalone iPad/iPhone app delivery

Favor clarity, reuse, gentle interaction design, and incremental progress.