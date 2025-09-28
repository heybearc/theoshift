/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
<<<<<<< HEAD
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/web/src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/web/src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/web/src/app/**/*.{js,ts,jsx,tsx,mdx}',
=======
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
>>>>>>> feature/admin-module-events-management
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
<<<<<<< HEAD
=======
      animation: {
        'spin': 'spin 1s linear infinite',
      },
      backdropBlur: {
        'sm': '4px',
      },
>>>>>>> feature/admin-module-events-management
    },
  },
  plugins: [],
}
