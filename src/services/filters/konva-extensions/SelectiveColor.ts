import Konva from 'konva';

/**
 * Color ranges for selective adjustment
 */
export enum ColorRange {
  Reds = 'reds',
  Yellows = 'yellows',
  Greens = 'greens',
  Cyans = 'cyans',
  Blues = 'blues',
  Magentas = 'magentas',
  Whites = 'whites',
  Neutrals = 'neutrals',
  Blacks = 'blacks'
}

export interface ColorAdjustment {
  cyan?: number;      // -100 to 100
  magenta?: number;   // -100 to 100
  yellow?: number;    // -100 to 100
  black?: number;     // -100 to 100
}

export interface SelectiveColorAdjustment {
  reds?: ColorAdjustment;
  yellows?: ColorAdjustment;
  greens?: ColorAdjustment;
  cyans?: ColorAdjustment;
  blues?: ColorAdjustment;
  magentas?: ColorAdjustment;
  whites?: ColorAdjustment;
  neutrals?: ColorAdjustment;
  blacks?: ColorAdjustment;
  method?: 'relative' | 'absolute'; // Default: relative
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
        break;
    }
  }
  
  return [h * 360, s * 100, l * 100];
}

/**
 * Convert RGB to CMYK
 */
function rgbToCmyk(r: number, g: number, b: number): [number, number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const k = 1 - Math.max(r, g, b);
  
  if (k === 1) {
    return [0, 0, 0, 100];
  }
  
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  
  return [c * 100, m * 100, y * 100, k * 100];
}

/**
 * Convert CMYK to RGB
 */
function cmykToRgb(c: number, m: number, y: number, k: number): [number, number, number] {
  c /= 100;
  m /= 100;
  y /= 100;
  k /= 100;
  
  const r = 255 * (1 - c) * (1 - k);
  const g = 255 * (1 - m) * (1 - k);
  const b = 255 * (1 - y) * (1 - k);
  
  return [
    Math.max(0, Math.min(255, Math.round(r))),
    Math.max(0, Math.min(255, Math.round(g))),
    Math.max(0, Math.min(255, Math.round(b)))
  ];
}

/**
 * Determine which color range a pixel belongs to
 */
function getColorRange(r: number, g: number, b: number): ColorRange | null {
  const [h, s, l] = rgbToHsl(r, g, b);
  
  // Whites, neutrals, and blacks based on saturation and lightness
  if (s < 10) {
    if (l > 80) return ColorRange.Whites;
    if (l < 20) return ColorRange.Blacks;
    return ColorRange.Neutrals;
  }
  
  // Color ranges based on hue
  if (h >= 345 || h < 15) return ColorRange.Reds;
  if (h >= 15 && h < 45) return ColorRange.Yellows;
  if (h >= 45 && h < 165) return ColorRange.Greens;
  if (h >= 165 && h < 195) return ColorRange.Cyans;
  if (h >= 195 && h < 285) return ColorRange.Blues;
  if (h >= 285 && h < 345) return ColorRange.Magentas;
  
  return null;
}

/**
 * Calculate the influence of a color range on a pixel
 * Returns a value between 0 and 1 based on how much the pixel belongs to the range
 */
function getColorRangeInfluence(r: number, g: number, b: number, range: ColorRange): number {
  const [h, s, l] = rgbToHsl(r, g, b);
  
  // Handle achromatic ranges
  if (range === ColorRange.Whites) {
    if (s < 10 && l > 80) return 1;
    if (s < 20 && l > 70) return 0.5;
    return 0;
  }
  
  if (range === ColorRange.Blacks) {
    if (s < 10 && l < 20) return 1;
    if (s < 20 && l < 30) return 0.5;
    return 0;
  }
  
  if (range === ColorRange.Neutrals) {
    if (s < 10 && l >= 20 && l <= 80) return 1;
    if (s < 20 && l >= 15 && l <= 85) return 0.5;
    return 0;
  }
  
  // Handle chromatic ranges with smooth falloff
  const hueRanges: { [key in ColorRange]?: [number, number, number, number] } = {
    [ColorRange.Reds]: [345, 15, 330, 30],     // center, width, min, max (wraps around 0)
    [ColorRange.Yellows]: [30, 30, 15, 45],
    [ColorRange.Greens]: [105, 120, 45, 165],
    [ColorRange.Cyans]: [180, 30, 165, 195],
    [ColorRange.Blues]: [240, 90, 195, 285],
    [ColorRange.Magentas]: [315, 60, 285, 345]
  };
  
  const rangeData = hueRanges[range];
  if (!rangeData) return 0;
  
  const [center, width, min, max] = rangeData;
  
  // Handle hue wrap-around for reds
  let hueDistance: number;
  if (range === ColorRange.Reds) {
    if (h > 180) {
      hueDistance = Math.min(Math.abs(h - 360), Math.abs(h - (360 + center)));
    } else {
      hueDistance = Math.abs(h - center);
    }
  } else {
    hueDistance = Math.abs(h - center);
  }
  
  // Calculate influence based on distance from center
  const influence = Math.max(0, 1 - (hueDistance / (width / 2)));
  
  // Reduce influence for low saturation
  return influence * Math.min(1, s / 30);
}

/**
 * Apply CMYK adjustments to RGB values
 */
function applyCMYKAdjustment(
  r: number, 
  g: number, 
  b: number, 
  adjustment: ColorAdjustment, 
  influence: number,
  method: 'relative' | 'absolute'
): [number, number, number] {
  if (!adjustment || influence === 0) {
    return [r, g, b];
  }
  
  let [c, m, y, k] = rgbToCmyk(r, g, b);
  
  // Apply adjustments based on method
  if (method === 'relative') {
    // Relative adjustments scale existing values
    if (adjustment.cyan !== undefined) {
      const cyanAdjust = (adjustment.cyan / 100) * influence;
      c = c + (cyanAdjust > 0 ? (100 - c) * cyanAdjust : c * cyanAdjust);
    }
    if (adjustment.magenta !== undefined) {
      const magentaAdjust = (adjustment.magenta / 100) * influence;
      m = m + (magentaAdjust > 0 ? (100 - m) * magentaAdjust : m * magentaAdjust);
    }
    if (adjustment.yellow !== undefined) {
      const yellowAdjust = (adjustment.yellow / 100) * influence;
      y = y + (yellowAdjust > 0 ? (100 - y) * yellowAdjust : y * yellowAdjust);
    }
    if (adjustment.black !== undefined) {
      const blackAdjust = (adjustment.black / 100) * influence;
      k = k + (blackAdjust > 0 ? (100 - k) * blackAdjust : k * blackAdjust);
    }
  } else {
    // Absolute adjustments add fixed amounts
    if (adjustment.cyan !== undefined) {
      c = c + (adjustment.cyan * influence);
    }
    if (adjustment.magenta !== undefined) {
      m = m + (adjustment.magenta * influence);
    }
    if (adjustment.yellow !== undefined) {
      y = y + (adjustment.yellow * influence);
    }
    if (adjustment.black !== undefined) {
      k = k + (adjustment.black * influence);
    }
  }
  
  // Clamp values
  c = Math.max(0, Math.min(100, c));
  m = Math.max(0, Math.min(100, m));
  y = Math.max(0, Math.min(100, y));
  k = Math.max(0, Math.min(100, k));
  
  return cmykToRgb(c, m, y, k);
}

/**
 * Professional Selective Color Filter for Konva
 * Allows precise adjustments to specific color ranges
 * 
 * Usage:
 * image.cache();
 * image.filters([Konva.Filters.SelectiveColor]);
 * image.selectiveColor({
 *   reds: { cyan: -20, yellow: 10 },
 *   yellows: { magenta: -15, yellow: 20 },
 *   blues: { cyan: 10, magenta: 5 },
 *   method: 'relative'
 * });
 */
Konva.Filters.SelectiveColor = function(imageData: ImageData) {
  const data = imageData.data;
  const node = this as any;
  const adjustments = node.selectiveColor();
  
  if (!adjustments) return;
  
  const method = adjustments.method || 'relative';
  
  // Process each pixel
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    
    // Apply adjustments for each color range that affects this pixel
    const ranges: ColorRange[] = [
      ColorRange.Reds,
      ColorRange.Yellows,
      ColorRange.Greens,
      ColorRange.Cyans,
      ColorRange.Blues,
      ColorRange.Magentas,
      ColorRange.Whites,
      ColorRange.Neutrals,
      ColorRange.Blacks
    ];
    
    for (const range of ranges) {
      const adjustment = adjustments[range];
      if (!adjustment) continue;
      
      const influence = getColorRangeInfluence(r, g, b, range);
      if (influence > 0) {
        [r, g, b] = applyCMYKAdjustment(r, g, b, adjustment, influence, method);
      }
    }
    
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
};

// Register the selectiveColor property
Konva.Factory.addGetterSetter(Konva.Node, 'selectiveColor', null);

// Preset selective color adjustments
export const SelectiveColorPresets = {
  /**
   * Enhance skin tones
   */
  enhanceSkinTones: (): SelectiveColorAdjustment => ({
    reds: { cyan: -5, magenta: 5, yellow: 10 },
    yellows: { cyan: -5, magenta: 5, yellow: 15 },
    method: 'relative'
  }),
  
  /**
   * Vibrant landscape
   */
  vibrantLandscape: (): SelectiveColorAdjustment => ({
    greens: { cyan: 10, yellow: 20, black: -10 },
    blues: { cyan: 15, magenta: -5 },
    cyans: { cyan: 20, magenta: -10 },
    method: 'relative'
  }),
  
  /**
   * Autumn colors
   */
  autumnColors: (): SelectiveColorAdjustment => ({
    reds: { magenta: 10, yellow: 20 },
    yellows: { magenta: 5, yellow: 25, black: -5 },
    greens: { cyan: -20, yellow: 30, magenta: 10 },
    method: 'relative'
  }),
  
  /**
   * Cool tones
   */
  coolTones: (): SelectiveColorAdjustment => ({
    reds: { cyan: 10, magenta: -5 },
    yellows: { cyan: 15, magenta: -10 },
    whites: { cyan: 5, magenta: 2 },
    method: 'relative'
  }),
  
  /**
   * Warm tones
   */
  warmTones: (): SelectiveColorAdjustment => ({
    blues: { cyan: -10, magenta: 5, yellow: 10 },
    cyans: { cyan: -15, yellow: 20 },
    whites: { yellow: 5, magenta: 2 },
    method: 'relative'
  }),
  
  /**
   * Black and white with color pop
   */
  colorPop: (keepColor: ColorRange): SelectiveColorAdjustment => {
    const adjustment: SelectiveColorAdjustment = {
      method: 'absolute'
    };
    
    // Desaturate all colors except the chosen one
    const ranges = [
      ColorRange.Reds,
      ColorRange.Yellows,
      ColorRange.Greens,
      ColorRange.Cyans,
      ColorRange.Blues,
      ColorRange.Magentas
    ];
    
    for (const range of ranges) {
      if (range !== keepColor) {
        adjustment[range] = { cyan: 0, magenta: 0, yellow: 0, black: 100 };
      }
    }
    
    return adjustment;
  }
};

// Type augmentation for TypeScript
declare module 'konva/lib/Node' {
  interface Node {
    selectiveColor: (value?: SelectiveColorAdjustment) => SelectiveColorAdjustment | this;
  }
}

declare module 'konva/lib/Shape' {
  interface Shape {
    selectiveColor: (value?: SelectiveColorAdjustment) => SelectiveColorAdjustment | this;
  }
}
