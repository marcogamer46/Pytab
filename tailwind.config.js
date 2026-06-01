/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        vscode: {
          bg: '#1e1e1e',
          sidebar: '#252526',
          activityBar: '#333333',
          border: '#454545',
          text: '#cccccc',
          selected: '#37373d',
          hover: '#2a2d2e',
          accent: '#007acc',
        }
      }
    },
  },
  plugins: [],
}
