# PgPm

**Local-first project task board for natural-language task capture, next-action recommendation, and lightweight project control.**

PgPm is a React + Tauri desktop project management prototype. It lets users enter tasks in natural language, parses dates, priorities, owners, labels, time estimates, API usage, and cost fields, then organizes the result into a project task board with simple recommendation logic.

> 中文：PgPm 是一个本地优先的项目任务板，用自然语言快速添加任务，并根据优先级、截止时间、成本、API 使用量和阻塞状态推荐下一步。

## Core features

- Natural-language one-line task input.
- Parsing support for Chinese dates, time spans, priorities, owners, labels, cost, API usage, and hours.
- Task board columns such as `Inbox`, `Now`, `Next`, `Later`, `Blocked`, and `Done`.
- Next-action recommendation based on WIP, deadline pressure, budget, priority, and blocked status.
- Local JSON storage for settings, tasks, and user action events.
- React + TypeScript + Vite frontend with Tauri desktop packaging path.

## Example input

```text
明天 14:00-16:00 写接口文档 2h P0 @你 ¥20 10kapi Now #后端 #接口
```

PgPm parses the line into structured task fields and makes it available on the task board.

## Development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Run with Tauri:

```bash
npm run tauri
```

## Project direction

PgPm is designed for small project operators who want less manual form filling and more direct task capture. The long-term direction is a lightweight personal project cockpit: capture quickly, normalize automatically, recommend the next useful action, and keep the data local.

## Status

Active prototype. The current repository contains the desktop app foundation, natural-language parser, sample data, board UI, and recommendation logic.
