  ## Beacon
  A native usability testing & analytics platform concept that transforms Miro boards into research labs with real-time heatmaps, AI insights, and statistical data.

  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-18.3-61dafb)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite-6.x-646cff)](https://vitejs.dev/)

  ### Prerequisites
  - Node.js 18.x or higher
  - npm 9.x or higher (or pnpm)

  ### Installation
  1. Clone the repository:
  ```bash
  git clone https://github.com/dayview/beacon.git
  cd beacon
  ```
  
  ### Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ### Tech Stack
  Core
  - React 18.3 (UI Library)
  - TypeScript (Type Safety)
  - Vite 6.3 (Build Tool and Dev Server)
  UI Components
  - Radix UI (Main components)
  - Material-UI (Additional UI Components)
  - Tailwind CSS 4 (Utility-first Styling)
  - Lucide React (Icon Library)
  Data Visualization
  - Recharts (Chart Library for Analytics)
  - Motion (Animation Library)
  State & Forms
  - React Hook Form (Form Management)
  - React DnD (Drag and Drop Functionality)

  ### Project Structure
  beacon/
  ├── src/
  │   ├── app/              # Main application component
  │   │   ├── App.tsx       # Root component with routing logic
  │   │   └── components/   # App-specific components
  │   ├── components/       # Shared/reusable components
  │   ├── screens/          # Main application screens
  │   │   ├── Dashboard.tsx
  │   │   ├── LiveAnalytics.tsx
  │   │   └── Comparison.tsx
  │   ├── lib/              # Utility functions and helpers
  │   ├── styles/           # Global styles and fonts
  │   └── main.tsx          # Application entry point
  ├── guidelines/           # Project guidelines and documentation
  ├── index.html           # HTML template
  ├── vite.config.ts       # Vite configuration
  └── package.json         # Project dependencies
