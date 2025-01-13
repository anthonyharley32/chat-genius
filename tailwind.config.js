/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'BlinkMacSystemFont',     // SF Pro Display - Apple's system font (best for digital)
          '-apple-system',          // Older Apple system font
          'Segoe UI',              // Microsoft's system font
          'Roboto',                // Google's system font
          'system-ui',             // Generic system UI font
          'Helvetica Neue',        // Classic digital-first font
          'Arial',                 // Fallback
          'sans-serif'             // Final fallback
        ],
      },
    },
  },
  plugins: [],
}

