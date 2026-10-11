const fs = require('fs');
const path = require('path');

// A client build's fonts (brand/fonts) are linked alongside the app's own.
const brandFonts = path.join(__dirname, 'brand', 'fonts');

module.exports = {
    assets: ['./assets/fonts', ...(fs.existsSync(brandFonts) ? ['./brand/fonts'] : [])],
};
