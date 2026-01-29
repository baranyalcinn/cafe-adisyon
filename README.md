<p align="center">
  <img src="resources/icon_caffio.png" alt="Caffio Logo" width="120" height="120">
</p>

<h1 align="center">☕ Caffio</h1>

<p align="center">
  <strong>Modern Cafe & Restaurant Point-of-Sale System</strong>
</p>

<p align="center">
  <em>A lightning-fast, offline-first POS application built with cutting-edge web technologies</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-40.0.0-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/React-19.2.1-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Prisma-7.3.0-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.1.18-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS">
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey?style=flat-square" alt="Platform">
</p>

---

## ✨ Features

### 🛒 Point-of-Sale

- **Intuitive Order Management** — Add, modify, and track orders with a sleek touch-friendly interface
- **Smart Product Catalog** — Organize products by categories with beautiful icons
- **Favorites System** — Quick access to frequently ordered items
- **Real-time Cart** — Instant updates with animated quantity selectors

### 🪑 Table Management

- **Visual Table Layout** — See all tables at a glance with status indicators
- **Order Association** — Seamlessly link orders to specific tables
- **Multi-order Support** — Handle multiple open orders per table

### 💳 Payment Processing

- **Multi-Payment Methods** — Cash and card payment support
- **Split Bills** — Divide payments across multiple methods
- **Transaction History** — Complete payment audit trail

### 📊 Analytics & Reporting

- **Live Dashboard** — Real-time sales metrics and statistics
- **Daily Summaries** — Automatic end-of-day reports with VAT calculations
- **Monthly Reports** — Track revenue, expenses, and net profit trends
- **Activity Logging** — Complete audit trail of all system activities

### ⚙️ Administration

- **PIN-Protected Settings** — Secure access with admin PIN
- **Product Management** — Add, edit, and organize products
- **Category Management** — Create custom categories with icons
- **Expense Tracking** — Record and categorize business expenses

### 🎨 Premium UI/UX

- **Glassmorphism Design** — Modern, translucent interface elements
- **Smooth Animations** — Powered by Framer Motion
- **Dark Mode Support** — Easy on the eyes during long shifts
- **Responsive Layout** — Optimized for various screen sizes

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Electron](https://www.electronjs.org/) 40 + [electron-vite](https://electron-vite.org/) |
| **Frontend** | [React](https://react.dev/) 19 + [TypeScript](https://www.typescriptlang.org/) 5.9 |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) 4 + [Radix UI](https://www.radix-ui.com/) |
| **State** | [Zustand](https://zustand.docs.pmnd.rs/) + [TanStack Query](https://tanstack.com/query) |
| **Database** | [Prisma](https://www.prisma.io/) ORM + [LibSQL](https://turso.tech/libsql) (SQLite) |
| **Animations** | [Framer Motion](https://www.framer.com/motion/) |
| **Validation** | [Zod](https://zod.dev/) |
| **Testing** | [Vitest](https://vitest.dev/) + [Playwright](https://playwright.dev/) |
| **Documentation** | [Storybook](https://storybook.js.org/) 10 |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **npm** 10.x or higher (comes with Node.js)
- **Git** for version control

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/baranyalcinn/cafe-adisyon.git
   cd cafe-adisyon
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Initialize the database**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start the development server**

   ```bash
   npm run dev
   ```

The application will launch in development mode with hot module replacement enabled.

---

## 📁 Project Structure

```
cafe-adisyon/
├── 📂 src/
│   ├── 📂 main/           # Electron main process
│   │   ├── index.ts       # Main entry point
│   │   └── ...            # IPC handlers, services
│   ├── 📂 preload/        # Electron preload scripts
│   │   └── index.ts       # Secure IPC bridge
│   ├── 📂 renderer/       # React frontend
│   │   └── src/
│   │       ├── 📂 features/
│   │       │   ├── dashboard/   # Analytics & stats
│   │       │   ├── orders/      # POS & order management
│   │       │   ├── payments/    # Payment processing
│   │       │   ├── settings/    # Admin configuration
│   │       │   └── tables/      # Table management
│   │       ├── 📂 components/   # Shared UI components
│   │       ├── 📂 hooks/        # Custom React hooks
│   │       └── 📂 lib/          # Utilities & helpers
│   ├── 📂 shared/         # Shared types & constants
│   └── 📂 stories/        # Storybook stories
├── 📂 prisma/
│   └── schema.prisma      # Database schema
├── 📂 build/              # Build resources & icons
├── 📂 resources/          # Application assets
├── electron.vite.config.ts
├── package.json
└── README.md
```

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build for production (all platforms) |
| `npm run build:win` | Build Windows executable |
| `npm run build:mac` | Build macOS application |
| `npm run build:linux` | Build Linux AppImage |
| `npm run lint` | Run ESLint code analysis |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run unit tests with Vitest |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run storybook` | Launch Storybook on port 6006 |
| `npm run db:reset` | Reset database (destructive) |
| `npm run db:soft-reset` | Soft reset database |

---

## 🧪 Testing

Caffio uses **Vitest** for unit testing and **Playwright** for end-to-end testing.

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test -- --watch

# Run with coverage
npm run test -- --coverage
```

---

## 📚 Component Documentation

Caffio uses **Storybook** for interactive component documentation and development.

```bash
# Start Storybook
npm run storybook

# Build static documentation
npm run build-storybook
```

Visit [http://localhost:6006](http://localhost:6006) to explore components.

---

## 🏗️ Building for Production

### Windows

```bash
npm run build:win
```

Output: `dist/caffio-1.0.0-setup.exe` (installer) and portable version

### macOS

```bash
npm run build:mac
```

Output: `dist/caffio-1.0.0.dmg`

### Linux

```bash
npm run build:linux
```

Output: `dist/caffio-1.0.0.AppImage`

---

## 🔒 Security

Caffio implements several security best practices:

- **Context Isolation** — Renderer process is isolated from Node.js
- **Secure IPC** — All inter-process communication is validated with Zod schemas
- **Content Security Policy** — Strict CSP headers prevent XSS attacks
- **PIN Protection** — Admin functions are protected with PIN authentication
- **No Remote Code** — Fully offline-capable, no external dependencies at runtime

---

## 🔧 IDE Setup

### Recommended Extensions

- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) — JavaScript/TypeScript linting
- [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) — Code formatting
- [Tailwind CSS IntelliSense](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss) — CSS completions
- [Prisma](https://marketplace.visualstudio.com/items?itemName=Prisma.prisma) — Database schema support

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Baran**

- GitHub: [@baranyalcinn](https://github.com/baranyalcinn)

---

<p align="center">
  Made with ☕ and ❤️
</p>
