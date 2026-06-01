import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputFile = 'APP logo.png';
const androidResPath = 'android/app/src/main/res';

const sizes = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

async function generateIcons() {
  if (!fs.existsSync(inputFile)) {
    console.error(`Input file "${inputFile}" not found.`);
    return;
  }

  for (const { folder, size } of sizes) {
    const targetDir = path.join(androidResPath, folder);
    
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, 'ic_launcher.png');
    const targetPathRound = path.join(targetDir, 'ic_launcher_round.png');

    try {
      // Standard icon
      await sharp(inputFile)
        .resize(size, size)
        .toFile(targetPath);
      
      // Round icon (using a circular mask)
      const circleShape = Buffer.from(
        `<svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" /></svg>`
      );

      await sharp(inputFile)
        .resize(size, size)
        .composite([{
          input: circleShape,
          blend: 'dest-in'
        }])
        .toFile(targetPathRound);

      console.log(`Generated icons for ${folder} (${size}x${size})`);
    } catch (err) {
      console.error(`Error generating icon for ${folder}:`, err);
    }
  }
}

generateIcons();
