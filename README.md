<div align="center">
  
  # Beacon
  **A native usability testing and analytics platform built as a Miro application. It enables UX researchers and designers to overlay real-time heatmaps directly on Miro boards and gain AI-powered insights from user interaction data, all without leaving their design workflow.**

  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-18.3-61dafb)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite-6.x-646cff)](https://vitejs.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
  
</div>

  ### Prerequisites
  - [Node.js](https://nodejs.org/) `18.x` or higher
  - [npm](https://www.npmjs.com/) `9.x` or higher(or [pnpm](https://pnpm.io/))
  - A [Miro](https://miro.com/) account with developer access

  ### Getting Started
  1. Clone the repository:
  ```bash
  git clone https://github.com/dayview/beacon.git
  cd beacon
  ```

  ### Install dependencies
  ```bash
  npm install
  # or
  pnpm install
  ```

  ### Start the development server
  ```bash
  npm run dev
  ```
  The app will be available a `http://localhost:5173` by default.
  
  ### Scripts
  | Command | Description |
  |---|---|
  | `npm run dev` | Starts the local development server |
  | `npm run build` | Builds the app for production |
  | `npm run preview` | Previews the production build locally |
  | `npm run lint` | Runs ESLint for code quality checks |

  ### Project Structure
  ```
  beacon/
  ├── src/
  │   ├── app/                  # Main application component
  │   │   ├── App.tsx           # Root component with routing logic
  │   │   └── components/       # App-specific components
  │   ├── components/           # Shared/reusable UI components
  │   ├── screens/              # Main application screens
  │   │   ├── Dashboard.tsx
  │   │   ├── LiveAnalytics.tsx
  │   │   └── Comparison.tsx
  │   ├── lib/                  # Utility functions and helpers
  │   ├── styles/               # Global styles and fonts
  │   └── main.tsx              # Application entry point
  ├── guidelines/               # Project guidelines and documentation
  ├── index.html                # HTML template
  ├── vite.config.ts            # Vite configuration
  └── package.json              # Project dependencies
  ```

  ### Tech Stack
  #### Core
  | Package | Version | Purpose |
  |---|---|---|
  | [React](https://react.dev/) | 18.3 | UI Library |
  | [TypeScript](https://www.typescriptlang.org/) | 5.x | Type Safety |
  | [Vite](https://vitejs.dev/) | 6.x | Build Tool & Dev Server |
  
  ### UI & Styling
  | Package | Purpose |
  |---|---|
  | [Radix UI](https://www.radix-ui.com/) | Accessible base components |
  | [Material UI](https://mui.com/) | Additional UI components |
  | [Tailwind CSS](https://tailwindcss.com/) | Utility-first styling |
  | [Lucide React](https://lucide.dev/) | Icon library |
  
  ### Data & Interaction
  | Package | Purpose |
  |---|---|
  | [Recharts](https://recharts.org/) | Chart library for analytics |
  | [Motion](https://motion.dev/) | Animation library |
  | [React Hook Form](https://react-hook-form.com/) | Form management |
  | [React DnD](https://react-dnd.github.io/react-dnd/) | Drag and drop |

  ### Contributing

  Contributions are welcome! If you have suggestions or find bugs, feel free to open an issue or submit a pull request.
  
  1. Fork the repository
  2. Create your feature branch: `git checkout -b feature/your-feature-name`
  3. Commit your changes: `git commit -m 'feat: add your feature'`
  4. Push to the branch: `git push origin feature/your-feature-name`
  5. Open a Pull Request
