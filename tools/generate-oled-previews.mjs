import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceRoot = dirname(root);
const outDir = join(root, "assets", "oled");

const W = 128;
const H = 64;

const font = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  "_": ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  ">": ["10000", "01000", "00100", "00010", "00100", "01000", "10000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
};

class Canvas {
  constructor() {
    this.pixels = new Uint8Array(W * H);
  }

  set(x, y, value = 1) {
    if (x >= 0 && x < W && y >= 0 && y < H) {
      this.pixels[y * W + x] = value ? 1 : 0;
    }
  }

  get(x, y) {
    return x >= 0 && x < W && y >= 0 && y < H ? this.pixels[y * W + x] : 0;
  }

  fillRect(x, y, w, h, value = 1) {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) this.set(xx, yy, value);
    }
  }

  clearRect(x, y, w, h) {
    this.fillRect(x, y, w, h, 0);
  }

  drawRect(x, y, w, h, value = 1) {
    this.line(x, y, x + w - 1, y, value);
    this.line(x, y + h - 1, x + w - 1, y + h - 1, value);
    this.line(x, y, x, y + h - 1, value);
    this.line(x + w - 1, y, x + w - 1, y + h - 1, value);
  }

  drawRoundRect(x, y, w, h, _r = 1, value = 1) {
    this.drawRect(x, y, w, h, value);
    this.set(x, y, 0);
    this.set(x + w - 1, y, 0);
    this.set(x, y + h - 1, 0);
    this.set(x + w - 1, y + h - 1, 0);
  }

  line(x0, y0, x1, y1, value = 1) {
    let dx = Math.abs(x1 - x0);
    let sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0);
    let sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    while (true) {
      this.set(x0, y0, value);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  drawBitmap(x, y, bytes, w, h, value = 1) {
    const stride = Math.ceil(w / 8);
    for (let yy = 0; yy < h; yy += 1) {
      for (let xx = 0; xx < w; xx += 1) {
        const b = bytes[yy * stride + Math.floor(xx / 8)] || 0;
        if (b & (0x80 >> (xx % 8))) this.set(x + xx, y + yy, value);
      }
    }
  }

  drawText(x, y, text, size = 1, value = 1) {
    let cx = x;
    let cy = y;
    for (const raw of String(text)) {
      if (raw === "\n") {
        cx = x;
        cy += 8 * size;
        continue;
      }
      const glyph = font[raw.toUpperCase()] || font[" "];
      for (let gy = 0; gy < glyph.length; gy += 1) {
        for (let gx = 0; gx < glyph[gy].length; gx += 1) {
          if (glyph[gy][gx] === "1") this.fillRect(cx + gx * size, cy + gy * size, size, size, value);
        }
      }
      cx += 6 * size;
    }
  }
}

function readSource(relativePath) {
  return readFileSync(join(sourceRoot, relativePath), "utf8");
}

function parseArray(source, name) {
  const safe = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`(?:const|static)[\\s\\S]*?${safe}[\\s\\S]*?=\\s*\\{([\\s\\S]*?)\\};`));
  if (!match) throw new Error(`Missing array: ${name}`);
  return [...match[1].matchAll(/B[01]+|0x[\da-fA-F]+|\b\d+\b/g)].map(([token]) => {
    if (token.startsWith("B")) return parseInt(token.slice(1), 2);
    return Number(token);
  });
}

function drawDoomText(canvas, x, y, text, spritesSource) {
  const bytes = parseArray(spritesSource, "bmp_font");
  const map = " 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ.,-_(){}[]#";
  const atlasBytesWide = 24;
  for (let i = 0; i < text.length; i += 1) {
    const index = map.indexOf(text[i]);
    if (index < 0) continue;
    const sx = index * 4;
    for (let yy = 0; yy < 6; yy += 1) {
      for (let xx = 0; xx < 4; xx += 1) {
        const sourceX = sx + xx;
        const b = bytes[yy * atlasBytesWide + Math.floor(sourceX / 8)] || 0;
        if (b & (0x80 >> (sourceX % 8))) canvas.set(x + i * 4 + xx, y + yy);
      }
    }
  }
}

function drawTinyTetrisBlock(canvas, xStart, pageStart, rows, rowCount, colCount) {
  let x = xStart;
  let page = pageStart;
  for (let r = 0; r < rowCount; r += 1) {
    for (let c = colCount - 1; c >= 0; c -= 1) {
      const byte = rows[r * colCount + c] || 0;
      for (let bit = 0; bit < 8; bit += 1) {
        if (byte & (1 << bit)) canvas.set(x, page * 8 + bit);
      }
      page += 1;
      if (page > 7) {
        page = pageStart;
        x += 1;
      }
    }
  }
}

function save(name, canvas) {
  const rects = [];
  for (let y = 0; y < H; y += 1) {
    let x = 0;
    while (x < W) {
      while (x < W && !canvas.get(x, y)) x += 1;
      const start = x;
      while (x < W && canvas.get(x, y)) x += 1;
      if (x > start) rects.push(`<rect x="${start}" y="${y}" width="${x - start}" height="1"/>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" shape-rendering="crispEdges">
  <rect width="${W}" height="${H}" fill="#020406"/>
  <g fill="#fff">${rects.join("")}</g>
</svg>
`;
  writeFileSync(join(outDir, `${name}.svg`), svg);
}

function frameFromBitmap(name, sourcePath, arrayName) {
  const canvas = new Canvas();
  canvas.drawBitmap(0, 0, parseArray(readSource(sourcePath), arrayName), 128, 64);
  save(name, canvas);
}

function frameDino() {
  const source = readSource("Dino-Tamagotchi-main/Tamaguino_DINO.ino");
  const canvas = new Canvas();
  canvas.drawText(0, 0, " jakobdesign presents");
  canvas.drawBitmap(15, 24, parseArray(source, "splash1"), 48, 26);
  canvas.drawBitmap(48, 24, parseArray(source, "splash2"), 80, 40);
  save("dino-tamagotchi", canvas);
}

function frameDoom() {
  const source = readSource("Doom/sprites.h");
  const canvas = new Canvas();
  canvas.drawBitmap(28, 5, parseArray(source, "bmp_logo_bits"), 72, 47);
  drawDoomText(canvas, 39, 51, "PRESS FIRE", source);
  save("doom", canvas);
}

function frameGyroRacer() {
  const canvas = new Canvas();
  canvas.drawText(0, 0, "3 FAST", 2);
  canvas.drawText(0, 18, "LAPS...", 2);
  save("gyro-racer", canvas);
}

function frameMultimeter() {
  const canvas = new Canvas();
  canvas.drawText(0, 0, "METER", 2);
  canvas.drawRect(0, 18, 128, 46);
  canvas.line(0, 34, 127, 34);
  canvas.line(0, 50, 127, 50);
  canvas.drawText(4, 22, "VOL>");
  canvas.drawText(64, 22, "0.00V");
  canvas.drawText(4, 38, "RES>");
  canvas.drawText(64, 38, ">100K");
  canvas.drawText(4, 54, "CNT>");
  canvas.drawText(64, 54, "NO");
  save("multimeter-oscilloscope", canvas);
}

function frameMiniPc() {
  const source = readSource("Mini-PC-Arduino-main/menu.h");
  const canvas = new Canvas();
  canvas.drawBitmap(0, 0, parseArray(source, "epd_bitmap_logo"), 64, 30);
  canvas.drawText(72, 6, "BEEP");
  canvas.drawText(82, 16, "ON");
  canvas.drawBitmap(4, 34, parseArray(source, "myBitmapcalc"), 24, 24);
  canvas.drawBitmap(32, 34, parseArray(source, "myBitmapstop"), 24, 24);
  canvas.drawBitmap(68, 34, parseArray(source, "myBitmapgam"), 24, 24);
  canvas.drawBitmap(96, 34, parseArray(source, "myBitmapcalen"), 24, 24);
  canvas.drawRoundRect(2, 32, 28, 28, 2);
  canvas.drawText(34, 57, "CALCULATOR");
  save("mini-pc", canvas);
}

function frameTinyTetris() {
  const source = readSource("arduino-Tiny-Tetris-main/Tiny_Tetris.ino");
  const canvas = new Canvas();
  drawTinyTetrisBlock(canvas, 50, 1, parseArray(source, "welcomeScreen"), 16, 5);
  drawTinyTetrisBlock(canvas, 1, 0, parseArray(source, "tetrisLogo"), 40, 8);
  save("tiny-tetris", canvas);
}

function frameTamagotchi() {
  const sprites = readSource("My_arduino_tamagotchi-main/Sprites.h");
  const canvas = new Canvas();
  canvas.drawText(2, 5, "H");
  canvas.drawRoundRect(9, 6, 27, 6, 1);
  canvas.fillRect(10, 7, 24, 4);
  canvas.drawText(43, 5, "S");
  canvas.drawRoundRect(50, 6, 27, 6, 1);
  canvas.fillRect(51, 7, 22, 4);
  canvas.drawText(85, 5, "F");
  canvas.drawRoundRect(92, 6, 27, 6, 1);
  canvas.fillRect(93, 7, 25, 4);
  canvas.drawRoundRect(0, 16, 50, 48, 5);
  canvas.drawBitmap(10, 18, parseArray(sprites, "myBitmapbody_01"), 32, 46);
  canvas.drawBitmap(10, 18, parseArray(sprites, "feet_bg"), 32, 46, 0);
  canvas.drawBitmap(10, 18, parseArray(sprites, "feet"), 32, 46);
  canvas.drawBitmap(10, 18, parseArray(sprites, "head_bg"), 32, 46, 0);
  canvas.drawBitmap(10, 18, parseArray(sprites, "head"), 32, 46);
  canvas.drawBitmap(10, 18, parseArray(sprites, "eyes"), 32, 46, 0);
  canvas.drawRoundRect(56, 33, 70, 16, 3);
  canvas.drawText(75, 21, "SLEEP");
  canvas.drawBitmap(56, 20, parseArray(sprites, "sleep_icon"), 10, 10);
  canvas.drawText(75, 37, "DRESS");
  canvas.drawBitmap(56, 36, parseArray(sprites, "dress_icon"), 10, 10);
  canvas.drawText(75, 53, "EAT");
  canvas.drawBitmap(56, 52, parseArray(sprites, "eat_icon"), 10, 10);
  save("tamagotchi", canvas);
}

mkdirSync(outDir, { recursive: true });
frameFromBitmap("flappy-bird", "Arduino-Games-main/Flappy-Bird/games_bitmaps.h", "epd_bitmap_FLAPPY_BIRD_cover");
frameFromBitmap("tetris", "Arduino-Games-main/Tetris/games_bitmaps.h", "epd_bitmap_TETRIS_cover");
frameTinyTetris();
frameDoom();
frameMiniPc();
frameFromBitmap("calculator", "Arduino-Uno-calculator--main/ardulator/Ardulator.ino", "epd_bitmap_Cover_screen");
frameMultimeter();
frameDino();
frameTamagotchi();
frameGyroRacer();

console.log(`Generated OLED previews in ${outDir}`);
