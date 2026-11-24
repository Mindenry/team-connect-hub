# Team Connect

Team collaboration app built with React, TypeScript and Vite. It covers meetings, chat, tasks, teams, a shared drive, a knowledge base and reporting.

This repository is configured as a front-end demo. The whole app runs against an in-browser mock API, so it can be hosted as a static site with no database or backend.

Live demo: https://team-connect-demo.netlify.app

Demo account:

- Email: `demo@siamdigital.co.th`
- Password: `demo1234`

The login page also has a **เข้าสู่เดโมทันที** button that signs in with the demo account directly.

## Features

- Dashboard with today's meetings, open tasks, online teammates and live rooms
- Meetings list, join lobby and a simulated meeting room with chat, hand raise, screen share and recording timer
- Channels and direct messages with threads, reactions, pinned messages and search
- Tasks with kanban, list and calendar views, plus subtasks, comments, attachments and issue links
- Teams, directory, invites, roles and permissions, organization settings and audit log
- Shared drive with folders, uploads, file versions and per-file access
- Wiki, announcements, reminders and notifications
- Reports with charts and CSV, Excel, JSON and PDF export

## Running locally

```bash
npm install
npm run dev:demo
```

Open http://localhost:8080.

To connect a real backend instead, run `npm run dev` and point `VITE_API_URL` at the API.

## Demo data

The mock layer is in `src/lib/demo`. It implements the endpoints the UI uses and persists data in `localStorage` under `teamconnect_demo_db_v1`. The DEMO badge in the bottom-right corner resets the sample data.

The meeting room is simulated on purpose. It uses the local webcam when permission is granted and does not send media anywhere.

## Build

```bash
npm run build
```

This produces a demo build in `dist`. Use `npm run build:real` when building against a real API.

## Deploy

`netlify.toml` already contains the SPA redirect, security headers and demo flag. Import the repository in Netlify with:

- Build command: `npm run build`
- Publish directory: `dist`

Or deploy from the CLI:

```bash
npm run build
npx netlify deploy --prod --dir=dist
```

## Notes

- Uploaded files are stored as data URLs. Very large files stay in memory only and are lost on refresh.
- Report exports run in the browser, so no export service is required.
- Each visitor gets a separate copy of the demo data.

## Project structure

```text
src/lib/demo/     mock API, seed data, localStorage and socket simulation
src/pages/        application pages, including DemoMeetingRoom.tsx
src/components/   shared UI components
```
