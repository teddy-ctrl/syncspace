/** @type {import('postcss').Postcss} */
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {}, // <-- This is the new, correct plugin name
    autoprefixer: {},
  },
};