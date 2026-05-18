import { findClosestColor, type BrandColors } from "./bead-colors";

export interface ProcessedPattern {
  grid: string[][];
  width: number;
  height: number;
  colorCounts: Record<string, number>;
  colors: [string, string, number, number, number][];
}

export async function processImage(
  imageElement: HTMLImageElement,
  gridWidth: number,
  gridHeight: number,
  colors: BrandColors[string],
  maxColors?: number,
  dithering = false
): Promise<ProcessedPattern> {
  const canvas = document.createElement("canvas");
  canvas.width = gridWidth;
  canvas.height = gridHeight;
  const ctx = canvas.getContext("2d")!;

  // Disable smoothing for pixel-accurate rendering
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(imageElement, 0, 0, gridWidth, gridHeight);

  const imageData = ctx.getImageData(0, 0, gridWidth, gridHeight);
  const data = imageData.data;

  const grid: string[][] = [];
  const colorCounts: Record<string, number> = {};

  // Floyd-Steinberg dithering
  const errors = dithering
    ? Array.from({ length: gridHeight }, () =>
        Array.from({ length: gridWidth }, () => [0, 0, 0] as [number, number, number])
      )
    : null;

  for (let y = 0; y < gridHeight; y++) {
    const row: string[] = [];
    for (let x = 0; x < gridWidth; x++) {
      const idx = (y * gridWidth + x) * 4;
      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];
      const a = data[idx + 3];

      // Apply error diffusion
      if (errors) {
        r = clamp(r + errors[y][x][0], 0, 255);
        g = clamp(g + errors[y][x][1], 0, 255);
        b = clamp(b + errors[y][x][2], 0, 255);
      }

      // Transparent pixels → null
      if (a < 128) {
        row.push("");
        continue;
      }

      const closest = findClosestColor([r, g, b], colors);
      const colorCode = closest[0];

      // Compute quantization error
      if (errors) {
        const errR = r - closest[2];
        const errG = g - closest[3];
        const errB = b - closest[4];

        const distribute = (dx: number, dy: number, weight: number) => {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
            errors[ny][nx][0] += errR * weight;
            errors[ny][nx][1] += errG * weight;
            errors[ny][nx][2] += errB * weight;
          }
        };

        distribute(1, 0, 7 / 16);
        distribute(-1, 1, 3 / 16);
        distribute(0, 1, 5 / 16);
        distribute(1, 1, 1 / 16);
      }

      row.push(colorCode);
      colorCounts[colorCode] = (colorCounts[colorCode] || 0) + 1;
    }
    grid.push(row);
  }

  // If max colors specified, merge rare colors
  if (maxColors && Object.keys(colorCounts).length > maxColors) {
    const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
    const keep = new Set(sorted.slice(0, maxColors).map(([c]) => c));
    const colorMap = new Map<string, string>();

    for (const [code] of sorted.slice(maxColors)) {
      const target = findClosestColor(
        [colors.find((c) => c[0] === code)![2], colors.find((c) => c[0] === code)![3], colors.find((c) => c[0] === code)![4]],
        colors.filter((c) => keep.has(c[0]))
      );
      colorMap.set(code, target[0]);
    }

    for (const code of colorMap.keys()) {
      delete colorCounts[code];
    }

    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const code = grid[y][x];
        if (code && colorMap.has(code)) {
          const newCode = colorMap.get(code)!;
          grid[y][x] = newCode;
          colorCounts[newCode] = (colorCounts[newCode] || 0) + 1;
        }
      }
    }
  }

  return { grid, width: gridWidth, height: gridHeight, colorCounts, colors };
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}
