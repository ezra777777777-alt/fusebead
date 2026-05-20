// SVG CAPTCHA generator — self-contained, no external dependencies

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
const COLORS = ["#1e3a5f", "#7b2d8b", "#1a6b3c", "#c2410c", "#0d9488", "#6d28d9"];

export function generateCaptchaText(length = 4): string {
  let text = "";
  for (let i = 0; i < length; i++) {
    text += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return text;
}

export function renderCaptchaSvg(text: string): string {
  const W = 160;
  const H = 60;
  const charW = W / (text.length + 1);

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  svg += `<rect width="${W}" height="${H}" fill="#f8f8f8" rx="4"/>`;

  // Noise dots
  for (let i = 0; i < 20; i++) {
    const cx = Math.random() * W;
    const cy = Math.random() * H;
    const r = Math.random() * 1.5 + 0.5;
    svg += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#999" opacity="${Math.random() * 0.15 + 0.05}"/>`;
  }

  // Interference lines
  for (let i = 0; i < 4; i++) {
    const x1 = Math.random() * W;
    const y1 = Math.random() * H;
    const x2 = Math.random() * W;
    const y2 = Math.random() * H;
    const cpX = (x1 + x2) / 2 + (Math.random() - 0.5) * 40;
    const cpY = (y1 + y2) / 2 + (Math.random() - 0.5) * 40;
    svg += `<path d="M${x1},${y1} Q${cpX},${cpY} ${x2},${y2}" stroke="#ccc" stroke-width="${Math.random() * 1.5 + 0.5}" fill="none" opacity="0.5"/>`;
  }

  // Characters
  for (let i = 0; i < text.length; i++) {
    const cx = charW * (i + 0.8);
    const cy = H / 2 + (Math.random() - 0.5) * 16;
    const rot = (Math.random() - 0.5) * 50;
    const size = Math.floor(Math.random() * 10 + 32);
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    svg += `<text x="${cx}" y="${cy}" font-size="${size}" font-weight="bold" font-family="Arial, sans-serif" fill="${color}" transform="rotate(${rot}, ${cx}, ${cy})" text-anchor="middle" dominant-baseline="central">${text[i]}</text>`;
  }

  svg += `</svg>`;
  return Buffer.from(svg).toString("base64");
}
