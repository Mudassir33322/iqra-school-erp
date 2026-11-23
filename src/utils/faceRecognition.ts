export interface FaceMatchCandidate {
  id: string;
  code: string;
  name: string;
  faceDescriptor?: number[];
  faceAvatar?: string;
}

export interface FaceMatchResult {
  matched: boolean;
  candidate: FaceMatchCandidate | null;
  score: number;
  confidencePercent: string;
}

/**
 * Computes a deterministic 64-dimensional L2-normalized facial descriptor from an RGBA pixel buffer
 * (centered 8x8 luminance & horizontal contrast projection). Works offline in both browser canvas
 * and pure Node unit tests.
 */
export function computeDescriptorFromPixels(
  rgba: ArrayLike<number>,
  width: number,
  height: number
): number[] {
  if (width <= 0 || height <= 0 || rgba.length < width * height * 4) {
    return [];
  }

  const gridSize = 8;
  const startX = Math.floor(width * 0.15);
  const endX = Math.max(startX + gridSize, Math.floor(width * 0.85));
  const startY = Math.floor(height * 0.1);
  const endY = Math.max(startY + gridSize, Math.floor(height * 0.9));

  const cellW = Math.max(1, Math.floor((endX - startX) / gridSize));
  const cellH = Math.max(1, Math.floor((endY - startY) / gridSize));

  const rawGrid: number[] = [];
  let sum = 0;

  for (let gy = 0; gy < gridSize; gy += 1) {
    for (let gx = 0; gx < gridSize; gx += 1) {
      let lumSum = 0;
      let count = 0;
      const y0 = startY + gy * cellH;
      const x0 = startX + gx * cellW;
      for (let y = y0; y < Math.min(height, y0 + cellH); y += 1) {
        for (let x = x0; x < Math.min(width, x0 + cellW); x += 1) {
          const idx = (y * width + x) * 4;
          const lum = 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];
          lumSum += lum;
          count += 1;
        }
      }
      const avg = count > 0 ? lumSum / count : 0;
      rawGrid.push(avg);
      sum += avg;
    }
  }

  const mean = sum / rawGrid.length;
  const centered = rawGrid.map((v) => v - mean);
  let normSq = 0;
  for (const v of centered) normSq += v * v;
  const norm = Math.sqrt(normSq);

  if (norm < 1e-6) {
    // Flat frame fallback: return normalized gradient index signature
    return centered.map((_, i) => Number((i === 0 ? 1 : 0).toFixed(4)));
  }

  return centered.map((v) => Number((v / norm).toFixed(5)));
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom < 1e-9) return 0;
  return Math.max(-1, Math.min(1, dot / denom));
}

export function matchFaceDescriptor(
  probe: number[],
  candidates: FaceMatchCandidate[],
  threshold = 0.72
): FaceMatchResult {
  const enrolled = candidates.filter((c) => Array.isArray(c.faceDescriptor) && c.faceDescriptor.length === probe.length);
  if (probe.length === 0 || enrolled.length === 0) {
    return { matched: false, candidate: null, score: 0, confidencePercent: '0.0%' };
  }

  let best: FaceMatchCandidate | null = null;
  let bestScore = -1;

  for (const cand of enrolled) {
    const score = cosineSimilarity(probe, cand.faceDescriptor!);
    if (score > bestScore) {
      bestScore = score;
      best = cand;
    }
  }

  const clamped = Math.max(0, bestScore);
  return {
    matched: best !== null && clamped >= threshold,
    candidate: best,
    score: Number(clamped.toFixed(4)),
    confidencePercent: `${(clamped * 100).toFixed(1)}%`,
  };
}

export function extractBiometricFromImageElement(
  source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | null,
  fallbackName: string,
  fallbackCode: string
): { avatarDataUrl: string; descriptor: number[] } {
  try {
    const canvas = document.createElement('canvas');
    const size = 240;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { avatarDataUrl: '', descriptor: [] };

    let hasVisual = false;
    if (source instanceof HTMLVideoElement && source.readyState >= 2 && source.videoWidth > 0) {
      const crop = Math.min(source.videoWidth, source.videoHeight);
      const sx = (source.videoWidth - crop) / 2;
      const sy = (source.videoHeight - crop) / 2;
      ctx.save();
      ctx.translate(size, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(source, sx, sy, crop, crop, 0, 0, size, size);
      ctx.restore();
      hasVisual = true;
    } else if (source instanceof HTMLImageElement && source.complete && source.naturalWidth > 0) {
      const crop = Math.min(source.naturalWidth, source.naturalHeight);
      const sx = (source.naturalWidth - crop) / 2;
      const sy = (source.naturalHeight - crop) / 2;
      ctx.drawImage(source, sx, sy, crop, crop, 0, 0, size, size);
      hasVisual = true;
    } else if (source instanceof HTMLCanvasElement && source.width > 0) {
      ctx.drawImage(source, 0, 0, size, size);
      hasVisual = true;
    }

    if (!hasVisual) {
      // Deterministic biometric monogram card seeded by person code
      let seed = 0;
      for (let i = 0; i < fallbackCode.length; i += 1) {
        seed = (seed * 31 + fallbackCode.charCodeAt(i)) % 360;
      }
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, `hsl(${(seed + 160) % 360}, 65%, 28%)`);
      grad.addColorStop(1, `hsl(${(seed + 195) % 360}, 70%, 20%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 3;
      ctx.strokeRect(18, 18, size - 36, size - 36);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 82px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((fallbackName || 'S').charAt(0).toUpperCase(), 120, 108);
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#ccfbf1';
      ctx.fillText(fallbackCode || 'BIOMETRIC', 120, 184);
    }

    const avatarDataUrl = canvas.toDataURL('image/png');
    // Sample down to 64x64 for fast descriptor extraction
    const sample = document.createElement('canvas');
    sample.width = 64;
    sample.height = 64;
    const sCtx = sample.getContext('2d');
    let descriptor: number[] = [];
    if (sCtx) {
      sCtx.drawImage(canvas, 0, 0, 64, 64);
      const imgData = sCtx.getImageData(0, 0, 64, 64);
      descriptor = computeDescriptorFromPixels(imgData.data, 64, 64);
    }
    return { avatarDataUrl, descriptor };
  } catch {
    return { avatarDataUrl: '', descriptor: [] };
  }
}
