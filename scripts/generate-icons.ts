import sharp from "sharp";
import fs from "fs";
import path from "path";

const assetsDir = path.join(process.cwd(), "assets");

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

const size = 1024; // nice high res for thumbar

async function generateIcons() {
  // Play
  const playSvg = `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 5V19L19 12L8 5Z" fill="white"/>
  </svg>`;

  // Pause
  const pauseSvg = `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 19H10V5H6V19ZM14 5V19H18V5H14Z" fill="white"/>
  </svg>`;

  // Next
  const nextSvg = `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 18L14.5 12L6 6V18ZM16 6V18H18V6H16Z" fill="white"/>
  </svg>`;

  // Prev
  const prevSvg = `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 6H8V18H6V6ZM9.5 12L18 18V6L9.5 12Z" fill="white"/>
  </svg>`;

  await sharp(Buffer.from(playSvg))
    .png()
    .toFile(path.join(assetsDir, "play.png"));
  await sharp(Buffer.from(pauseSvg))
    .png()
    .toFile(path.join(assetsDir, "pause.png"));
  await sharp(Buffer.from(nextSvg))
    .png()
    .toFile(path.join(assetsDir, "next.png"));
  await sharp(Buffer.from(prevSvg))
    .png()
    .toFile(path.join(assetsDir, "prev.png"));
}

generateIcons().catch(console.error);
