# AssetFlow Frontend Dashboard

This directory contains the Vite + React frontend dashboard client for **AssetFlow**.

## 🔌 System Architecture & Database Design
The complete system architecture, entity-relationship diagrams (ERD), and PostgreSQL tables schema details can be found in the root **[System README.md](../README.md#database-design-architecture)**.

---

## 🛠️ Features & Stack
* **Vite + React 19** (compiled using modern ES modules)
* **Tailwind CSS v4** (CSS-first configuration with a custom `@theme` registry)
* **Radix UI Primitives** (Dialog, Dropdown Menu, Select, Tabs, Tooltip)
* **Lucide Icons**
* **Responsive Layouts** (full-height sticky sidebars on desktop, auto-collapsing list views on mobile viewports)
* **Dynamic Color Theming** (flash-free toggle system supporting dark/light mode saved to `localStorage` with system default fallback)

---

## 📦 Developer Commands

### 1. Install dependencies
```bash
npm install
```

### 2. Run the development server
```bash
npm run dev
```

### 3. Run the linter
```bash
npm run lint
```

### 4. Build for production
```bash
npm run build
```
