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
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            a: {
              color: '#3b82f6',
              '&:hover': {
                color: '#2563eb',
              },
            },
            pre: {
              color: '#374151',
              backgroundColor: '#f3f4f6',
              borderRadius: '0.375rem',
              padding: '1rem',
              overflowX: 'auto',
              display: 'block',
              width: '100%',
              marginTop: '1em',
              marginBottom: '1em',
              whiteSpace: 'pre',
              '&::-webkit-scrollbar': {
                height: '8px',
              },
              '&::-webkit-scrollbar-track': {
                backgroundColor: '#f1f1f1',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: '#888',
                borderRadius: '4px',
                '&:hover': {
                  backgroundColor: '#666',
                },
              },
            },
            code: {
              color: '#374151',
              backgroundColor: '#f3f4f6',
              borderRadius: '0.25rem',
              paddingTop: '0.125rem',
              paddingBottom: '0.125rem',
              paddingLeft: '0.25rem',
              paddingRight: '0.25rem',
              '&::before': {
                content: '""',
              },
              '&::after': {
                content: '""',
              },
            },
            'pre code': {
              color: '#374151',
              backgroundColor: 'transparent',
              borderRadius: '0',
              padding: '0',
              whiteSpace: 'pre',
              border: 'none',
              display: 'inline-block',
              minWidth: '100%',
              '&::before': {
                content: '""',
              },
              '&::after': {
                content: '""',
              },
            },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

