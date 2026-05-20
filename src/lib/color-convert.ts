// Convert hex color grid to bead codes using palette color matching
type BeadColor = [string, string, number, number, number]; // [code, name, r, g, b]

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return null;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  // Weighted RGB distance (human eye is more sensitive to green)
  const dr = (r1 - r2) * 0.3;
  const dg = (g1 - g2) * 0.59;
  const db = (b1 - b2) * 0.11;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function hexGridToBeadCodes(
  hexGrid: string[][],
  palette: BeadColor[]
): string[][] {
  return hexGrid.map(row =>
    row.map(hex => {
      if (!hex) return "";
      const rgb = hexToRgb(hex);
      if (!rgb) return "";
      let best = palette[0];
      let bestDist = Infinity;
      for (const bead of palette) {
        const dist = colorDistance(rgb[0], rgb[1], rgb[2], bead[2], bead[3], bead[4]);
        if (dist < bestDist) { bestDist = dist; best = bead; }
      }
      return best[0];
    })
  );
}

export function hexCountsToBeadCounts(
  hexCounts: Record<string, number>,
  palette: BeadColor[]
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [hex, count] of Object.entries(hexCounts)) {
    const rgb = hexToRgb(hex);
    if (!rgb) continue;
    let best = palette[0];
    let bestDist = Infinity;
    for (const bead of palette) {
      const dist = colorDistance(rgb[0], rgb[1], rgb[2], bead[2], bead[3], bead[4]);
      if (dist < bestDist) { bestDist = dist; best = bead; }
    }
    result[best[0]] = (result[best[0]] || 0) + count;
  }
  return result;
}
