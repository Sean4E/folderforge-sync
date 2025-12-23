// ============================================================================
// FOLDERFORGE SYNC - WEBAPP ICON GENERATION SCRIPT
// Generates all required icon sizes for PWA and favicons
// ============================================================================

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');
const SVG_PATH = path.join(PUBLIC_DIR, 'folderforge-icon.svg');

// Icon sizes needed for PWA and favicons
const ICON_SIZES = [
  16,   // favicon
  32,   // favicon
  72,   // PWA
  96,   // PWA
  120,  // Apple touch icon
  128,  // PWA
  144,  // MS Tile, PWA
  152,  // Apple touch icon
  180,  // Apple touch icon
  192,  // PWA
  384,  // PWA
  512,  // PWA
];

async function generatePNG(inputPath, outputPath, size) {
  await sharp(inputPath)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(outputPath);

  console.log(`  Generated: icon-${size}.png`);
}

async function main() {
  console.log('FolderForge Sync - Webapp Icon Generation\n');

  // Check if source SVG exists
  if (!fs.existsSync(SVG_PATH)) {
    console.error('Error: Source folderforge-icon.svg not found at:', SVG_PATH);
    process.exit(1);
  }

  // Create icons directory if it doesn't exist
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
  }

  try {
    console.log('Generating PWA icons...');

    for (const size of ICON_SIZES) {
      await generatePNG(
        SVG_PATH,
        path.join(ICONS_DIR, `icon-${size}.png`),
        size
      );
    }

    console.log('\n✓ Webapp icon generation complete!');
    console.log('\nGenerated files in public/icons/:');
    ICON_SIZES.forEach(size => {
      console.log(`  - icon-${size}.png`);
    });

  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

main();
