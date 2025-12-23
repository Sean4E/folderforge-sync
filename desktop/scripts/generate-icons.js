// ============================================================================
// FOLDERFORGE SYNC - ICON GENERATION SCRIPT
// Generates all required icon sizes for Windows, Mac, and Linux
// ============================================================================

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const SVG_PATH = path.join(ASSETS_DIR, 'icon.svg');

// Icon sizes needed for different platforms
const ICON_SIZES = {
  // Windows needs multiple sizes in ICO
  windows: [16, 24, 32, 48, 64, 128, 256],
  // Mac needs 512 and 1024 for icns (electron-builder handles conversion)
  mac: [16, 32, 64, 128, 256, 512, 1024],
  // Linux needs various sizes
  linux: [16, 32, 48, 64, 128, 256, 512],
  // Tray icon (small)
  tray: [16, 22, 24, 32],
};

async function generatePNG(inputPath, outputPath, size) {
  await sharp(inputPath)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png()
    .toFile(outputPath);

  console.log(`  Generated: ${path.basename(outputPath)} (${size}x${size})`);
}

async function generateICO(pngPaths, outputPath) {
  const buffers = pngPaths.map(p => fs.readFileSync(p));
  const icoBuffer = await pngToIco(buffers);
  fs.writeFileSync(outputPath, icoBuffer);
  console.log(`  Generated: ${path.basename(outputPath)}`);
}

async function main() {
  console.log('FolderForge Sync - Icon Generation\n');

  // Check if source SVG exists
  if (!fs.existsSync(SVG_PATH)) {
    console.error('Error: Source icon.svg not found at:', SVG_PATH);
    console.log('\nPlease ensure assets/icon.svg exists.');
    process.exit(1);
  }

  // Create subdirectories
  const dirs = ['icons', 'icons/win', 'icons/mac', 'icons/linux'];
  dirs.forEach(dir => {
    const fullPath = path.join(ASSETS_DIR, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });

  try {
    // Generate main icon.png (512x512) for general use
    console.log('Generating main icons...');
    await generatePNG(SVG_PATH, path.join(ASSETS_DIR, 'icon.png'), 512);

    // Generate tray icon
    console.log('\nGenerating tray icons...');
    for (const size of ICON_SIZES.tray) {
      await generatePNG(
        SVG_PATH,
        path.join(ASSETS_DIR, `tray-icon${size === 16 ? '' : `-${size}`}.png`),
        size
      );
    }

    // Generate Windows icons
    console.log('\nGenerating Windows icons...');
    const winPngPaths = [];
    for (const size of ICON_SIZES.windows) {
      const pngPath = path.join(ASSETS_DIR, 'icons', 'win', `icon-${size}.png`);
      await generatePNG(SVG_PATH, pngPath, size);
      winPngPaths.push(pngPath);
    }

    // Generate ICO file
    await generateICO(winPngPaths, path.join(ASSETS_DIR, 'icon.ico'));

    // Generate Mac icons
    console.log('\nGenerating Mac icons...');
    for (const size of ICON_SIZES.mac) {
      await generatePNG(
        SVG_PATH,
        path.join(ASSETS_DIR, 'icons', 'mac', `icon-${size}.png`),
        size
      );
    }
    // Note: electron-builder will convert the 512/1024 PNGs to icns automatically
    // But we can also provide a ready 512x512 PNG named icon.png for it
    await generatePNG(SVG_PATH, path.join(ASSETS_DIR, 'icons', 'mac', 'icon.png'), 512);

    // Generate Linux icons
    console.log('\nGenerating Linux icons...');
    for (const size of ICON_SIZES.linux) {
      await generatePNG(
        SVG_PATH,
        path.join(ASSETS_DIR, 'icons', 'linux', `${size}x${size}.png`),
        size
      );
    }

    console.log('\n✓ Icon generation complete!');
    console.log('\nGenerated files:');
    console.log('  - assets/icon.png (512x512 main icon)');
    console.log('  - assets/icon.ico (Windows multi-size icon)');
    console.log('  - assets/tray-icon.png (16x16 tray icon)');
    console.log('  - assets/icons/win/ (Windows PNG sizes)');
    console.log('  - assets/icons/mac/ (Mac PNG sizes)');
    console.log('  - assets/icons/linux/ (Linux PNG sizes)');

    console.log('\nNote: For Mac .icns, electron-builder will generate it from icon.png');
    console.log('If you need a manual .icns, use a tool like iconutil on macOS.\n');

  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

main();
