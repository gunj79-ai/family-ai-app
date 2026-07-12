#!/usr/bin/env node

/**
 * Simple PNG icon generator using Canvas API (via node-canvas)
 * or basic PNG binary generation
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PUBLIC_DIR = path.resolve(__dirname, '../..', 'frontend', 'public');

// Ensure directory exists
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

/**
 * Create a valid PNG file with the given size and color
 * This creates an actual colored square PNG
 */
function createPNG(filename, size, colorHex) {
  // Parse color
  const r = parseInt(colorHex.slice(1, 3), 16);
  const g = parseInt(colorHex.slice(3, 5), 16);
  const b = parseInt(colorHex.slice(5, 7), 16);

  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk (13 bytes)
  const width = Buffer.allocUnsafe(4);
  width.writeUInt32BE(size, 0);
  const height = Buffer.allocUnsafe(4);
  height.writeUInt32BE(size, 0);

  const ihdrData = Buffer.concat([width, height, Buffer.from([0x08, 0x02, 0x00, 0x00, 0x00])]);
  const ihdr = createChunk('IHDR', ihdrData);

  // IDAT chunk - image data
  // Create raw image data: each scanline starts with filter type 0 (None)
  let rawData = [];
  for (let y = 0; y < size; y++) {
    rawData.push(0); // filter type
    for (let x = 0; x < size; x++) {
      rawData.push(r, g, b); // RGB
    }
  }
  const compressedData = zlib.deflateSync(Buffer.from(rawData));
  const idat = createChunk('IDAT', compressedData);

  // IEND chunk (0 bytes)
  const iend = createChunk('IEND', Buffer.alloc(0));

  const pngBuffer = Buffer.concat([signature, ihdr, idat, iend]);
  fs.writeFileSync(path.join(PUBLIC_DIR, filename), pngBuffer);
  console.log(`✓ Created ${filename} (${pngBuffer.length} bytes)`);
}

/**
 * Create a PNG chunk with CRC
 */
function createChunk(type, data) {
  const length = Buffer.allocUnsafe(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const chunkData = Buffer.concat([typeBuffer, data]);

  // Calculate CRC
  const crc32 = calculateCRC32(chunkData);
  const crcBuffer = Buffer.allocUnsafe(4);
  crcBuffer.writeUInt32BE(crc32, 0);

  return Buffer.concat([length, chunkData, crcBuffer]);
}

/**
 * CRC32 calculation
 */
function calculateCRC32(data) {
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }

  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate icons
createPNG('icon-192.png', 192, '#6366f1'); // Indigo
createPNG('icon-512.png', 512, '#6366f1'); // Indigo
createPNG('favicon.png', 32, '#6366f1');

// Also copy to backend/public for production
const backendPublicDir = path.resolve(__dirname, '../public');
if (fs.existsSync(backendPublicDir)) {
  ['icon-192.png', 'icon-512.png', 'favicon.png'].forEach(f => {
    const src = path.join(PUBLIC_DIR, f);
    const dst = path.join(backendPublicDir, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
      const size = fs.statSync(dst).size;
      console.log(`✓ Copied ${f} to backend/public (${size} bytes)`);
    }
  });
}

console.log('\n✓ All icons created successfully');
