import sharp from 'sharp';
import fs from 'fs';

const sizes = [16, 32, 48, 64, 128, 256];
const pngBuf = fs.readFileSync('assets/images/logo.png');

// ICO header
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);   // reserved
header.writeUInt16LE(1, 2);   // type = 1 (ICO)
header.writeUInt16LE(sizes.length, 4); // count

const dirEntries = [];
const imageBuffers = [];

for (const size of sizes) {
  const resized = await sharp(pngBuf)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toBuffer();
  
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);  // width
  entry.writeUInt8(size >= 256 ? 0 : size, 1);  // height
  entry.writeUInt8(0, 2);  // colors
  entry.writeUInt8(0, 3);  // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bpp
  entry.writeUInt32LE(resized.length, 8); // image size
  entry.writeUInt32LE(0, 12); // offset (filled later)
  dirEntries.push(entry);
  imageBuffers.push(resized);
}

// Calculate offsets
let offset = 6 + sizes.length * 16;
for (let i = 0; i < sizes.length; i++) {
  dirEntries[i].writeUInt32LE(offset, 12);
  offset += imageBuffers[i].length;
}

const ico = Buffer.concat([header, ...dirEntries, ...imageBuffers]);
fs.writeFileSync('assets/icon.ico', ico);
console.log(`Generated icon.ico: ${ico.length} bytes, ${sizes.length} sizes (${sizes.join(', ')}px)`);
