# Pytab

A Visual Studio-inspired Python Editor for Android Tablets.

## Features
- **Visual Studio UI**: Familiar layout with Activity Bar, Sidebar, Editor, and Terminal.
- **Python Editor**: Powered by Monaco Editor (the same one used in VS Code).
- **In-App Execution**: Run Python scripts directly on your tablet using Pyodide (WebAssembly).
- **Tablet Optimized**: Responsive design specifically for large screens.
- **GitHub Actions**: Automated CI/CD to build your Android APK.

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Editor**: Monaco Editor
- **Python Engine**: Pyodide
- **Mobile Wrapper**: Capacitor

## Getting Started

### Prerequisites
- Node.js >= 22
- Android Studio (for local Android builds)

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```

### Development
Run the web version in your browser:
```bash
npm run dev
```

### Android Build
1. Build the web assets:
   ```bash
   npm run build
   ```
2. Sync with the Android project:
   ```bash
   npx cap sync
   ```
3. Open in Android Studio:
   ```bash
   npx cap open android
   ```

## GitHub Actions
The project includes a GitHub Action in `.github/workflows/android.yml` that automatically builds a debug APK whenever you push to the `main` branch.
