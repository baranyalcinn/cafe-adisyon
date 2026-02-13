<p align="center">
  <img src="resources/icon_caffio.png" alt="Caffio Logo" width="120" height="120">
</p>

<h1 align="center">☕ Caffio</h1>

<p align="center">
  <strong>Modern Cafe & Restaurant Point-of-Sale System</strong>
</p>

<p align="center">
  <em>A lightning-fast, offline-first POS application built with cutting-edge web technologies.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-40.4.0-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Prisma-7.4-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.1-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/platform-Windows-lightgrey?style=flat-square" alt="Platform">
  <a href="https://github.com/baranyalcinn/cafe-adisyon/actions"><img src="https://img.shields.io/github/actions/workflow/status/baranyalcinn/cafe-adisyon/build.yml?branch=main&style=flat-square&label=CI%20Build" alt="CI Build"></a>
</p>

---

## ✨ Features

### 🛒 Ordering & POS

- **Touch-Friendly Interface** — Fast order creation, editing, and tracking
- **Smart Product Catalog** — Categorized product management with icons
- **Favorite Products** — Instant access to frequently ordered items
- **Real-Time Cart** — Animated quantity selector and instant calculation updates

### 🪑 Table Management

- **Visual Table Layout** — View all table statuses at a glance (empty / occupied / locked)
- **Order Linking** — Seamlessly assign orders to specific tables
- **Multi-Order Support** — Handle multiple open orders per table concurrently
- **Context Menu** — Quick actions via right-click (lock, checkout, add items)

### 💳 Payment Processing

- **Multi-Method Payments** — Support for Cash and Credit Card
- **Split Bill** — Ability to split the check across different payment methods
- **Partial Payment** — Pay for specific items individually
- **Transaction History** — Detailed audit trail of all payments

### 📊 Dashboard & Reporting

- **Real-Time Dashboard** — Instant sales metrics, daily and monthly summaries
- **Daily Z-Report** — End-of-day register closure (cash, card, VAT, expenses, net profit)
- **Monthly Reports** — Track revenue, expense, and net profit trends
- **Visual Analytics** — Interactive revenue charts powered by Recharts

### ⚙️ Administration Panel (PIN Protected)

| Tab             | Function                                               |
| --------------- | ------------------------------------------------------ |
| **Tables**      | Add, remove, and edit tables                           |
| **Categories**  | Manage product categories (with icon selection)        |
| **Products**    | Product CRUD operations, price and category assignment |
| **Expenses**    | Record and categorize operational expenses             |
| **Maintenance** | Database reset, Z-Report archiving                     |
| **Logs**        | Detailed audit logs of all system activities           |

### 🎨 Premium User Experience

- **Glassmorphism Design** — Modern, translucent UI elements
- **Fluid Animations** — Smooth page transitions and micro-interactions via Framer Motion
- **Dark Mode** — Reduces eye strain during long shifts
- **Custom Title Bar** — Frameless window with custom minimize/maximize/close controls
- **GPU Acceleration** — Optimized rendering performance
- **Sound Effects** — Audio feedback for completed actions

---

## 🏛️ Architecture

```mermaid
graph TD
    classDef renderer fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef main fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef ipc fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,stroke-dasharray: 5 5;
    classDef db fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;

    subgraph Renderer ["🎨 Renderer Process (React 19)"]
        direction TB
        Z[Zustand Stores]
        Q[TanStack Query]
        UI[Radix UI & Framer Motion]

        feat[Features: Dashboard, Orders, Tables, Reports, Settings]
    end

    subgraph IPC ["⚡ Secure IPC Bridge (Zod Validated)"]
        Preload[Context Isolation / Preload]
    end

    subgraph Main ["⚙️ Main Process (Electron 40)"]
        direction TB
        Handlers[9 IPC Handlers]
        Services[7 Backend Services]
    end

    subgraph Database ["🗄️ Data Layer"]
        Prisma[Prisma 7.4 ORM]
        SQLite[(LibSQL / SQLite)]
    end

    Renderer :::renderer --> IPC :::ipc
    IPC --> Main :::main
    Handlers --> Services
    Services --> Prisma :::db
    Prisma --> SQLite
```

---

## 🛠️ Tech Stack

| Layer                | Technology                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| **Framework**        | [Electron](https://www.electronjs.org/) 40 + [electron-vite](https://electron-vite.org/) 5             |
| **Frontend**         | [React](https://react.dev/) 19 + [TypeScript](https://www.typescriptlang.org/) 5.9                     |
| **Styling**          | [Tailwind CSS](https://tailwindcss.com/) 4 + [Radix UI](https://www.radix-ui.com/) Primitives          |
| **State Management** | [Zustand](https://zustand.docs.pmnd.rs/) 5 (4 stores) + [TanStack Query](https://tanstack.com/query) 5 |
| **Database**         | [Prisma](https://www.prisma.io/) 7.4 Client Engine + [LibSQL](https://turso.tech/libsql) (SQLite)      |
| **Animations**       | [Framer Motion](https://www.framer.com/motion/) 12                                                     |
| **Charting**         | [Recharts](https://recharts.org/) 3                                                                    |
| **Validation**       | [Zod](https://zod.dev/) 4                                                                              |
| **Testing**          | [Vitest](https://vitest.dev/) 4 + [Playwright](https://playwright.dev/)                                |
| **Build**            | [electron-builder](https://www.electron.build/) 26 (NSIS Installer)                                    |
| **CI/CD**            | [GitHub Actions](https://github.com/features/actions) (Windows, auto-artifact)                         |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **npm** 10.x or higher
- **Git**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/baranyalcinn/cafe-adisyon.git
cd cafe-adisyon

# 2. Install dependencies
npm install

# 3. Initialize the database
npx prisma generate
npx prisma db push

# 4. Start the development server
npm run dev
```

> **Note:** `bufferutil` and `utf-8-validate` are optional native modules. You may see warnings if Visual Studio Build Tools are not installed, but the application will still function correctly.

---

## 📁 Project Structure

```
cafe-adisyon/
├── 📂 src/
│   ├── 📂 main/                    # Electron main process
│   │   ├── index.ts                # Application entry point + window management
│   │   ├── 📂 db/                  # Prisma client configuration
│   │   ├── 📂 ipc/                 # IPC router + 9 handler modules
│   │   │   └── 📂 routes/          # order, table, product, category, payment,
│   │   │                           # admin, expense, log, maintenance, reporting
│   │   ├── 📂 services/            # Business logic layer (7 services)
│   │   │   ├── OrderService.ts     # Order CRUD, item add/remove, locking
│   │   │   ├── ReportingService.ts # Z-report, monthly report, dashboard data
│   │   │   ├── MaintenanceService.ts # DB maintenance, data reset, archiving
│   │   │   ├── AdminService.ts     # PIN management, security questions
│   │   │   ├── ProductService.ts   # Product & favorite management
│   │   │   ├── ExpenseService.ts   # Expense logging & tracking
│   │   │   └── LogService.ts       # Activity logging (queue system)
│   │   └── 📂 lib/                 # Logger, DB maintenance cron
│   ├── 📂 preload/                 # Secure IPC bridge (Context Isolation)
│   ├── 📂 renderer/                # React frontend
│   │   └── 📂 src/
│   │       ├── App.tsx             # Main layout, sidebar Nav, page routing
│   │       ├── 📂 features/        # Feature-based modular structure
│   │       │   ├── dashboard/      # Real-time sales metrics
│   │       │   ├── orders/         # POS interface, cart, item selection
│   │       │   ├── payments/       # Payment processing, bill splitting
│   │       │   ├── reports/        # Monthly report views
│   │       │   ├── settings/       # 6-tab administration panel
│   │       │   └── tables/         # Visual table layout
│   │       ├── 📂 components/      # Shared UI components (21 Radix-based)
│   │       ├── 📂 hooks/           # useOrder, useInventory, useTables, useSound, useTheme
│   │       ├── 📂 store/           # Zustand stores (cart, table, settings, toast)
│   │       ├── 📂 services/        # Renderer-side IPC service calls (9 modules)
│   │       └── 📂 lib/             # Helpers, utils
│   └── 📂 shared/                  # Shared types and constants
├── 📂 prisma/
│   └── schema.prisma               # 10 models: Product, Category, Table, Order, etc.
├── 📂 .github/workflows/
│   └── build.yml                   # GitHub Actions CI/CD (Windows NSIS build)
├── 📂 build/                       # Platform icons (ico, icns, png)
├── 📂 scripts/                     # DB reset scripts
├── electron-builder.yml            # Build config (ASAR, NSIS, code signing)
├── electron.vite.config.ts         # Vite config (main + preload + renderer)
└── package.json
```

---

## 📜 Available Scripts

| Command                 | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `npm run dev`           | Start development server with HMR              |
| `npm run build`         | Prisma generate + typecheck + production build |
| `npm run build:win`     | Create Windows `.exe` installer (NSIS)         |
| `npm run build:mac`     | Create macOS `.dmg`                            |
| `npm run build:linux`   | Create Linux AppImage                          |
| `npm run lint`          | Run ESLint code analysis                       |
| `npm run format`        | Run Prettier code formatting                   |
| `npm run test`          | Run unit tests via Vitest                      |
| `npm run typecheck`     | Run TypeScript type checking (node + web)      |
| `npm run db:reset`      | Fully reset database ⚠️                        |
| `npm run db:soft-reset` | Soft reset database                            |

---

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run in watch mode
npm run test -- --watch

# Run with coverage report
npm run test -- --coverage
```

- **Unit Tests:** Vitest 4 + Testing Library
- **Browser Tests:** Playwright + `@vitest/browser-playwright`
- **Coverage:** `@vitest/coverage-v8`

---

## 🏗️ Production Build

### Windows

```bash
npm run build:win
```

Output: `dist/Caffio-Setup-1.0.0.exe` (NSIS installer)

**Build features:**

- ASAR packaging (native modules excluded)
- Maximum compression
- Desktop shortcut creation
- Custom installation directory selection
- Prisma schema and database included as `extraResources`

### CI/CD (GitHub Actions)

Automatic build triggered on every push to `main`:

1. Dependency installation (`npm install --legacy-peer-deps`)
2. Prisma generate + Native rebuild
3. TypeScript build
4. Node modules surgical pruning (runtime deps only)
5. NSIS installer creation via `electron-builder`
6. Upload to GitHub Artifacts (5-day retention)

---

## 🗄️ Database Schema

```
[Category] --1:N-- [Product]
                       |
[Table] --1:N-- [Order] --1:N-- [OrderItem] --N:1-- [Product]
                   |
            [Transaction] (1:N)
```

---

## 🔒 Security

| Measure               | Description                                                |
| --------------------- | ---------------------------------------------------------- |
| **Context Isolation** | Renderer process completely isolated from Node.js          |
| **Secure IPC**        | All inter-process communication validated with Zod schemas |
| **CSP Headers**       | Content Security Policy prevents XSS attacks               |
| **PIN Protection**    | Admin functions guarded by PIN authentication              |
| **Security Question** | Recovery mechanism in case of forgotten PIN                |
| **Offline First**     | No runtime external dependencies, fully offline capable    |
| **Frameless Window**  | Custom title bar, DevTools disabled in production          |
| **Graceful Shutdown** | Safe database disconnection on app exit                    |

---

## 🔧 Development Environment

### Recommended VS Code Extensions

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) — Code analysis
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) — Automatic formatting
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) — CSS completion
- [Prisma](https://marketplace.visualstudio.com/items?itemName=Prisma.prisma) — Schema support

### Project Rules

- **TypeScript Strict Mode** — Fully type-safe code
- **ESLint** — `@electron-toolkit` + `@eslint-react` rulesets
- **Prettier** — Automatic code formatting
- **Feature-Based Architecture** — Each feature lives in its own directory

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Developer

**Baran**

- GitHub: [@baranyalcinn](https://github.com/baranyalcinn)

---

<p align="center">
  Made with ☕ and ❤️ — <strong>Caffio</strong>
</p>
