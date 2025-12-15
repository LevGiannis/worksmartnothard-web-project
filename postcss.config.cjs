const plugins = {}
try {
  // load tailwind if it's installed; if not, skip so dev server can run with fallbacks
  // eslint-disable-next-line global-require
  const tailwind = require('tailwindcss')
  plugins['tailwindcss'] = tailwind
} catch (err) {
  // tailwind not present — continue without it
}
try {
  // eslint-disable-next-line global-require
  const autoprefixer = require('autoprefixer')
  plugins['autoprefixer'] = autoprefixer
} catch (err) {
  // autoprefixer not present — continue
}

module.exports = { plugins }
