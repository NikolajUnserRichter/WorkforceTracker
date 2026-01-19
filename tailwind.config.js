/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        // P3 Brand Colors - Primary/Structural
        p3: {
          midnight: '#00002d',      // App background, header/sidebar, primary text on light
          electric: '#0000ff',      // Primary actions, active states, interactive elements

          // Secondary/Contextual
          green: '#005b4c',         // Financial stability, cost savings, positive deltas
          purple: '#6544fe',        // Scenarios, simulations, what-if analysis

          // Highlight/Accent (use sparingly)
          lemon: '#dbff55',         // KPI highlights, callouts, selected cards
          salmon: '#ff7f6a',        // Warnings, risk indicators, negative deltas
        },

        // Semantic color aliases for easier usage
        primary: {
          DEFAULT: '#0000ff',
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0000ff',
          600: '#0000dd',
          700: '#0000bb',
          800: '#000099',
          900: '#00002d',
          950: '#00001a',
        },

        // Success states (cost savings, positive)
        success: {
          DEFAULT: '#005b4c',
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#005b4c',
          700: '#004a3d',
          800: '#003a2f',
          900: '#002a22',
        },

        // Warning/Risk states
        warning: {
          DEFAULT: '#ff7f6a',
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#ffd4c9',
          300: '#ffb8a8',
          400: '#ff9c87',
          500: '#ff7f6a',
          600: '#e66b58',
          700: '#cc5746',
          800: '#b34334',
          900: '#992f22',
        },

        // Accent (highlight)
        accent: {
          DEFAULT: '#dbff55',
          50: '#fdfff0',
          100: '#f9ffe0',
          200: '#f0ffb8',
          300: '#e5ff8a',
          400: '#dbff55',
          500: '#c4e64d',
          600: '#a3bf40',
          700: '#829933',
          800: '#617326',
          900: '#404d19',
        },

        // Analysis/Scenario states
        analysis: {
          DEFAULT: '#6544fe',
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#6544fe',
          600: '#5738e3',
          700: '#492cc8',
          800: '#3b20ad',
          900: '#2d1492',
        },

        // Neutral grays - enterprise-grade
        gray: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
      },

      animation: {
        'progress': 'progress 1s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out forwards',
      },

      keyframes: {
        progress: {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },

      boxShadow: {
        'enterprise': '0 1px 3px 0 rgb(0 0 45 / 0.04), 0 1px 2px -1px rgb(0 0 45 / 0.04)',
        'enterprise-md': '0 4px 6px -1px rgb(0 0 45 / 0.05), 0 2px 4px -2px rgb(0 0 45 / 0.05)',
        'enterprise-lg': '0 10px 15px -3px rgb(0 0 45 / 0.06), 0 4px 6px -4px rgb(0 0 45 / 0.06)',
        'card': '0 1px 2px 0 rgb(0 0 45 / 0.03)',
        'card-hover': '0 4px 12px 0 rgb(0 0 45 / 0.08)',
        'sidebar': '2px 0 8px -2px rgb(0 0 45 / 0.1)',
      },

      borderRadius: {
        'enterprise': '6px',
      },

      spacing: {
        'sidebar': '256px',
        'sidebar-collapsed': '72px',
        'header': '64px',
      },

      fontSize: {
        'kpi': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '600' }],
        'kpi-label': ['0.75rem', { lineHeight: '1rem', fontWeight: '500', letterSpacing: '0.05em' }],
      },

      transitionDuration: {
        '250': '250ms',
      },
    },
  },
  plugins: [],
}
