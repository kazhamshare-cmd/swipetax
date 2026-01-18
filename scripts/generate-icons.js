const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '../public');
const svgPath = path.join(publicDir, 'favicon.svg');

// Icon sizes needed for various platforms
const sizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  // iOS App Store sizes
  { size: 1024, name: 'icon-1024.png' },
];

async function generateIcons() {
  console.log('Generating icons from favicon.svg...\n');

  for (const { size, name } of sizes) {
    const outputPath = path.join(publicDir, name);

    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    console.log(`✓ Generated ${name} (${size}x${size})`);
  }

  // Generate favicon.ico (multi-size ICO file simulation - just use 32x32)
  const icoPath = path.join(publicDir, 'favicon.ico');
  await sharp(svgPath)
    .resize(32, 32)
    .png()
    .toFile(icoPath.replace('.ico', '-temp.png'));

  // Rename to .ico (browsers accept PNG with .ico extension)
  fs.renameSync(icoPath.replace('.ico', '-temp.png'), icoPath);
  console.log(`✓ Generated favicon.ico`);

  console.log('\n✅ All icons generated successfully!');
  console.log('\nFiles created in /public:');
  sizes.forEach(({ name }) => console.log(`  - ${name}`));
  console.log('  - favicon.ico');
}

generateIcons().catch(console.error);
