# Khadamatak (خدماتك)

Production-ready foundation for a large-scale services marketplace and social platform.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4** design system
- **next-intl** — Arabic (RTL) & Dutch (LTR)
- **Zustand** UI state
- **Framer Motion** ready / CSS motion tokens
- **Lucide** icons

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — locale proxy redirects to `/ar` or `/nl`.

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Development server       |
| `npm run build`| Production build         |
| `npm run start`| Start production server  |
| `npm run lint` | ESLint                   |

## Routes

| Path                 | Description        |
| -------------------- | ------------------ |
| `/[locale]`          | Home feed          |
| `/[locale]/login`    | Login              |
| `/[locale]/register` | Register           |
| `/[locale]/forgot-password` | Password recovery |
| `/[locale]/search`   | Search             |
| `/[locale]/products` | Products           |
| `/[locale]/groups`   | Groups             |
| `/[locale]/messages` | Messages           |
| `/[locale]/notifications` | Notifications |
| `/[locale]/profile`  | Profile             |
| `/[locale]/settings` | Settings + language|
| `/[locale]/wallet`   | Wallet (shell)     |
| `/[locale]/deals`    | Deals (shell)      |
| `/[locale]/admin`    | Admin panel shell  |

## Architecture

```
src/
  app/[locale]/     # Locale-aware routes (auth, main, admin)
  components/
    ui/             # Design system primitives
    layout/         # Sidebar, top nav, bottom nav, shell
    feed/           # Home feed UI
    auth/           # Auth UI shells/forms
    shared/         # Logo, page header, feature shell
  config/           # Site + navigation config
  i18n/             # Routing, navigation helpers, request config
  types/            # User, roles, permissions foundation
  stores/           # Client UI stores
messages/           # ar.json, nl.json
```

## Foundation scope

This phase delivers:

- Scalable folder structure & routing
- Premium mobile-first UI + design system
- Full AR/NL i18n with RTL/LTR
- Navigation (desktop sidebar + mobile bottom nav)
- Home feed structure (no mock data)
- User/role/permission type foundation
- Connected real pages (no fake links)

Not included yet (by design): auth logic, wallet, marketplace, messaging, notifications logic, deals, admin business logic.
