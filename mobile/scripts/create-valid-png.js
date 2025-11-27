#!/usr/bin/env node
// Helper script to create valid PNG images that won't trigger jimp-compact CRC errors
// Usage: node create-valid-png.js <width> <height> <output-file> [r] [g] [b]

const fs = require('fs');
const { createCanvas } = require('canvas');

const width = parseInt(process.argv[2]) || 1024;
const height = parseInt(process.argv[3]) || 1024;
const outputFile = process.argv[4] || 'output.png';
const r = parseInt(process.argv[5]) || 0;
const g = parseInt(process.argv[6]) || 0;
const b = parseInt(process.argv[7]) || 0;

try {
  // Try using canvas if available (better quality)
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, width, height);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputFile, buffer);
  console.log(`Created ${width}x${height} PNG: ${outputFile}`);
} catch (error) {
  // Fallback: Create minimal valid PNG manually
  // PNG signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const crypto = require('crypto');
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type (RGB)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  const ihdrChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0D]), // chunk length
    Buffer.from('IHDR'),
    ihdrData
  ]);
  
  // Calculate CRC for IHDR
  const crc32 = require('crc-32');
  const ihdrCrc = crc32.buf(Buffer.concat([Buffer.from('IHDR'), ihdrData])) >>> 0;
  const ihdrCrcBuf = Buffer.alloc(4);
  ihdrCrcBuf.writeUInt32BE(ihdrCrc, 0);
  
  // IEND chunk
  const iend = Buffer.from([
    0x00, 0x00, 0x00, 0x00, // length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  const png = Buffer.concat([signature, ihdrChunk, ihdrCrcBuf, iend]);
  fs.writeFileSync(outputFile, png);
  console.log(`Created minimal ${width}x${height} PNG: ${outputFile}`);
}

