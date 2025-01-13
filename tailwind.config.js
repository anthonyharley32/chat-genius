/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',                 // Modern, clean font perfect for UI
          'ui-sans-serif',         // Modern system UI font
          'system-ui',             // System UI fallback
          '-apple-system',         // Apple system
          'BlinkMacSystemFont',    // Apple system
          'Segoe UI',             // Windows
          'Roboto',               // Android/Chrome
          'Helvetica Neue',       // Legacy support
          'Arial',                // Web-safe fallback
          'sans-serif'            // Final fallback
        ],
      },
    },
  },
  plugins: [],
}

