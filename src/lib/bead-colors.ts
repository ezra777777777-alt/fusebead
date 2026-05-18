export const PERLER_COLORS: [string, string, number, number, number][] = [
  ["P01", "White", 255, 255, 255],
  ["P02", "Cream", 255, 249, 223],
  ["P03", "Peach", 255, 202, 155],
  ["P04", "Blush", 247, 177, 172],
  ["P05", "Hot Coral", 245, 117, 107],
  ["P06", "Red", 227, 69, 60],
  ["P07", "Cranberry", 167, 41, 60],
  ["P08", "Magenta", 215, 45, 137],
  ["P09", "Plum", 148, 61, 116],
  ["P10", "Purple", 141, 72, 175],
  ["P11", "Pastel Lavender", 189, 161, 209],
  ["P12", "Lavender", 160, 137, 199],
  ["P13", "Bubblegum", 245, 147, 188],
  ["P14", "Pink", 242, 137, 170],
  ["P15", "Raspberry", 198, 60, 104],
  ["P16", "Hot Pink", 226, 47, 110],
  ["P17", "Orange", 248, 147, 57],
  ["P18", "Cheddar", 243, 171, 52],
  ["P19", "Yellow", 253, 226, 69],
  ["P20", "Pastel Yellow", 253, 247, 176],
  ["P21", "Kiwi Lime", 149, 193, 64],
  ["P22", "Prickly Pear", 135, 190, 134],
  ["P23", "Bright Green", 68, 179, 94],
  ["P24", "Dark Green", 56, 123, 72],
  ["P25", "Toothpaste", 131, 211, 196],
  ["P26", "Turquoise", 47, 171, 193],
  ["P27", "Pastel Blue", 148, 202, 239],
  ["P28", "Light Blue", 99, 174, 227],
  ["P29", "Dark Blue", 51, 101, 181],
  ["P30", "Cobalt Blue", 47, 66, 139],
  ["P31", "Tan", 201, 160, 115],
  ["P32", "Light Brown", 195, 140, 99],
  ["P33", "Brown", 136, 88, 60],
  ["P34", "Dark Brown", 79, 53, 37],
  ["P35", "Grey", 164, 164, 160],
  ["P36", "Dark Grey", 100, 99, 98],
  ["P37", "Black", 38, 38, 38],
  ["P38", "Silver", 208, 210, 211],
  ["P39", "Gold", 226, 192, 55],
  ["P40", "Neon Orange", 251, 128, 24],
  ["P41", "Neon Yellow", 249, 228, 0],
  ["P42", "Neon Green", 96, 201, 53],
  ["P43", "Neon Blue", 17, 152, 232],
  ["P44", "Neon Pink", 247, 36, 120],
  ["P45", "Neon Purple", 170, 44, 238],
  ["P46", "Glitter White", 245, 245, 245],
  ["P47", "Glitter Gold", 237, 208, 75],
  ["P48", "Glitter Silver", 215, 215, 215],
  ["P49", "Glitter Blue", 45, 115, 210],
  ["P50", "Glitter Pink", 245, 105, 155],
  ["P51", "Clear", 245, 245, 235],
  ["P52", "Translucent Blue", 180, 210, 235],
  ["P53", "Translucent Pink", 235, 195, 205],
  ["P54", "Glow White", 252, 252, 252],
  ["P55", "Glow Green", 180, 245, 180],
  ["P56", "Glow Blue", 170, 220, 250],
  ["P57", "Glow Orange", 250, 200, 130],
  ["P58", "Glow Pink", 250, 180, 195],
  ["P59", "Striped Blue/White", 140, 185, 230],
  ["P60", "Striped Pink/White", 235, 165, 185],
] as const;

export type BrandColors = Record<string, [string, string, number, number, number][]>;

export const PALETTES: Record<string, { name: string; colors: BrandColors[string] }> = {
  perler: { name: "Perler", colors: PERLER_COLORS as unknown as BrandColors[string] },
};

export function colorDistance(
  rgb1: [number, number, number],
  rgb2: [number, number, number]
): number {
  const rmean = (rgb1[0] + rgb2[0]) / 2;
  const dr = rgb1[0] - rgb2[0];
  const dg = rgb1[1] - rgb2[1];
  const db = rgb1[2] - rgb2[2];
  return Math.sqrt(
    ((512 + rmean) * dr * dr) / 256 +
    4 * dg * dg +
    ((767 - rmean) * db * db) / 256
  );
}

export function findClosestColor(
  pixel: [number, number, number],
  colors: [string, string, number, number, number][]
): [string, string, number, number, number] {
  let best = colors[0];
  let bestDist = Infinity;
  for (const c of colors) {
    const d = colorDistance(pixel, [c[2], c[3], c[4]]);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return best;
}
