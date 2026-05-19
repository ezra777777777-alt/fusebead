import { findClosestColor, type BrandColors } from "./bead-colors";

export interface ProcessedPattern {
  grid: string[][];
  width: number;
  height: number;
  colorCounts: Record<string, number>;
  colors: [string, string, number, number, number][];
}

export interface ImageAdjustments {
  brightness: number;  // 0-200, 100 = neutral
  contrast: number;    // 0-200, 100 = neutral
  saturation: number;  // 0-200, 100 = neutral
  removeBg: boolean;
  bgColor: [number, number, number];
  bgTolerance: number; // 0-100
}

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  removeBg: false,
  bgColor: [255, 255, 255],
  bgTolerance: 20,
};

export function applyAdjustments(
  imageData: ImageData,
  adjustments: ImageAdjustments
): ImageData {
  const data = imageData.data;
  const result = new Uint8ClampedArray(data);

  const bFactor = adjustments.brightness / 100;
  const cFactor = adjustments.contrast / 100;
  const sFactor = adjustments.saturation / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Brightness
    r = clamp(r * bFactor, 0, 255);
    g = clamp(g * bFactor, 0, 255);
    b = clamp(b * bFactor, 0, 255);

    // Contrast
    r = clamp((r - 128) * cFactor + 128, 0, 255);
    g = clamp((g - 128) * cFactor + 128, 0, 255);
    b = clamp((b - 128) * cFactor + 128, 0, 255);

    // Saturation
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = clamp(gray + (r - gray) * sFactor, 0, 255);
    g = clamp(gray + (g - gray) * sFactor, 0, 255);
    b = clamp(gray + (b - gray) * sFactor, 0, 255);

    result[i] = r;
    result[i + 1] = g;
    result[i + 2] = b;

    // Background removal
    if (adjustments.removeBg) {
      const [br, bg, bb] = adjustments.bgColor;
      const dist = Math.sqrt((r - br) ** 2 + (g - bg) ** 2 + (b - bb) ** 2);
      if (dist < adjustments.bgTolerance * 2.55) {
        result[i + 3] = 0; // Make transparent
      }
    }
  }

  return new ImageData(result, imageData.width, imageData.height);
}

export function samplePixel(
  imageElement: HTMLImageElement,
  x: number,
  y: number
): [number, number, number] {
  const canvas = document.createElement("canvas");
  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imageElement, 0, 0);
  
  const scaleX = imageElement.naturalWidth / imageElement.width;
  const scaleY = imageElement.naturalHeight / imageElement.height;
  const px = Math.floor(x * scaleX);
  const py = Math.floor(y * scaleY);
  
  const pixel = ctx.getImageData(px, py, 1, 1).data;
  return [pixel[0], pixel[1], pixel[2]];
}

export async function processImage(
  imageElement: HTMLImageElement,
  gridWidth: number,
  gridHeight: number,
  colors: BrandColors[string],
  maxColors?: number,
  dithering = false,
  adjustments: ImageAdjustments = DEFAULT_ADJUSTMENTS
): Promise<ProcessedPattern> {
  const canvas = document.createElement("canvas");
  canvas.width = gridWidth;
  canvas.height = gridHeight;
  const ctx = canvas.getContext("2d")!;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(imageElement, 0, 0, gridWidth, gridHeight);

  let imageData = ctx.getImageData(0, 0, gridWidth, gridHeight);
  
  // Apply image adjustments
  const hasAdjustments =
    adjustments.brightness !== 100 ||
    adjustments.contrast !== 100 ||
    adjustments.saturation !== 100 ||
    adjustments.removeBg;
  
  if (hasAdjustments) {
    imageData = applyAdjustments(imageData, adjustments);
  }

  const data = imageData.data;
  const grid: string[][] = [];
  const colorCounts: Record<string, number> = {};

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

      if (errors) {
        r = clamp(r + errors[y][x][0], 0, 255);
        g = clamp(g + errors[y][x][1], 0, 255);
        b = clamp(b + errors[y][x][2], 0, 255);
      }

      if (a < 128) {
        row.push("");
        continue;
      }

      const closest = findClosestColor([r, g, b], colors);
      const colorCode = closest[0];

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
    for (const code of colorMap.keys()) delete colorCounts[code];
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
