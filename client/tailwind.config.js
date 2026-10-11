/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#EFEBDD',   // page background
        card: '#FBF8EE',    // card surface
        ink: '#0B0B0B',     // borders, text, dark surfaces
        signal: '#FFD23F',  // primary accent (yellow)
        alarm: '#FF4D3D',   // errors, serious allegations
        go: '#2FBF71',      // success
        steel: '#3A3A36',   // secondary text on paper
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'Haettenschweiler', '"Arial Narrow Bold"', 'sans-serif'],
        sans: ['"Space Grotesk"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'hard-sm': '3px 3px 0 0 #0B0B0B',
        hard: '6px 6px 0 0 #0B0B0B',
        'hard-lg': '10px 10px 0 0 #0B0B0B',
        'hard-signal': '8px 8px 0 0 #FFD23F',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        marquee: 'marquee 28s linear infinite',
      },
    },
  },
  plugins: [],
}
