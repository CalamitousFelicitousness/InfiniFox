import Konva from 'konva';

/**
 * Cubic bezier interpolation for smooth curves
 */
function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const oneMinusT = 1 - t;
  const oneMinusTSquared = oneMinusT * oneMinusT;
  const oneMinusTCubed = oneMinusTSquared * oneMinusT;
  const tSquared = t * t;
  const tCubed = tSquared * t;
  
  return oneMinusTCubed * p0 + 3 * oneMinusTSquared * t * p1 + 3 * oneMinusT * tSquared * p2 + tCubed * p3;
}

/**
 * Generate lookup table from control points
 */
function generateLUT(controlPoints: Array<{ x: number; y: number }>): Uint8Array {
  const lut = new Uint8Array(256);
  
  // Sort control points by x value
  const sortedPoints = [...controlPoints].sort((a, b) => a.x - b.x);
  
  // Ensure we have start and end points
  if (sortedPoints[0].x > 0) {
    sortedPoints.unshift({ x: 0, y: 0 });
  }
  if (sortedPoints[sortedPoints.length - 1].x < 255) {
    sortedPoints.push({ x: 255, y: 255 });
  }
  
  // Generate LUT using cubic bezier interpolation between points
  let currentPoint = 0;
  for (let i = 0; i < 256; i++) {
    // Find the segment this x value belongs to
    while (currentPoint < sortedPoints.length - 2 && i > sortedPoints[currentPoint + 1].x) {
      currentPoint++;
    }
    
    if (currentPoint >= sortedPoints.length - 1) {
      lut[i] = Math.round(sortedPoints[sortedPoints.length - 1].y);
      continue;
    }
    
    const p0 = sortedPoints[currentPoint];
    const p1 = sortedPoints[currentPoint + 1];
    
    // Calculate control points for cubic bezier
    // Using Catmull-Rom to calculate control points for smooth curve
    const p0Prev = sortedPoints[Math.max(0, currentPoint - 1)];
    const p1Next = sortedPoints[Math.min(sortedPoints.length - 1, currentPoint + 2)];
    
    const tension = 0.5; // Adjust for curve smoothness
    const cp1x = p0.x + (p1.x - p0Prev.x) * tension;
    const cp1y = p0.y + (p1.y - p0Prev.y) * tension;
    const cp2x = p1.x - (p1Next.x - p0.x) * tension;
    const cp2y = p1.y - (p1Next.y - p0.y) * tension;
    
    // Calculate t parameter for current x position
    const t = (i - p0.x) / (p1.x - p0.x);
    
    // Use cubic bezier for y value
    const y = cubicBezier(t, p0.y, cp1y, cp2y, p1.y);
    lut[i] = Math.max(0, Math.min(255, Math.round(y)));
  }
  
  return lut;
}

export interface CurveChannel {
  rgb?: Array<{ x: number; y: number }>;
  red?: Array<{ x: number; y: number }>;
  green?: Array<{ x: number; y: number }>;
  blue?: Array<{ x: number; y: number }>;
}

/**
 * Professional Curves Filter for Konva
 * Allows independent adjustment of RGB channels and combined RGB curve
 * 
 * Usage:
 * image.cache();
 * image.filters([Konva.Filters.Curves]);
 * image.curves({
 *   rgb: [{ x: 0, y: 0 }, { x: 64, y: 50 }, { x: 192, y: 205 }, { x: 255, y: 255 }],
 *   red: [{ x: 0, y: 0 }, { x: 128, y: 140 }, { x: 255, y: 255 }]
 * });
 */
Konva.Filters.Curves = function(imageData: ImageData) {
  const data = imageData.data;
  const node = this as any;
  const curves = node.curves();
  
  if (!curves) return;
  
  // Generate lookup tables for each channel
  const rgbLUT = curves.rgb ? generateLUT(curves.rgb) : null;
  const redLUT = curves.red ? generateLUT(curves.red) : null;
  const greenLUT = curves.green ? generateLUT(curves.green) : null;
  const blueLUT = curves.blue ? generateLUT(curves.blue) : null;
  
  // Apply curves to image data
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];
    
    // Apply individual channel curves
    if (redLUT) {
      r = redLUT[r];
    }
    if (greenLUT) {
      g = greenLUT[g];
    }
    if (blueLUT) {
      b = blueLUT[b];
    }
    
    // Apply combined RGB curve
    if (rgbLUT) {
      r = rgbLUT[r];
      g = rgbLUT[g];
      b = rgbLUT[b];
    }
    
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
};

// Register the curves property
Konva.Factory.addGetterSetter(Konva.Node, 'curves', null);

// Helper function to create common curve presets
export const CurvePresets = {
  /**
   * Increase contrast (S-curve)
   */
  contrast: (): CurveChannel => ({
    rgb: [
      { x: 0, y: 0 },
      { x: 64, y: 48 },
      { x: 128, y: 128 },
      { x: 192, y: 208 },
      { x: 255, y: 255 }
    ]
  }),
  
  /**
   * Decrease contrast (inverse S-curve)
   */
  lowContrast: (): CurveChannel => ({
    rgb: [
      { x: 0, y: 0 },
      { x: 64, y: 80 },
      { x: 128, y: 128 },
      { x: 192, y: 176 },
      { x: 255, y: 255 }
    ]
  }),
  
  /**
   * Brighten shadows
   */
  liftShadows: (): CurveChannel => ({
    rgb: [
      { x: 0, y: 20 },
      { x: 64, y: 80 },
      { x: 128, y: 140 },
      { x: 255, y: 255 }
    ]
  }),
  
  /**
   * Darken highlights
   */
  crushHighlights: (): CurveChannel => ({
    rgb: [
      { x: 0, y: 0 },
      { x: 128, y: 115 },
      { x: 192, y: 176 },
      { x: 255, y: 235 }
    ]
  }),
  
  /**
   * Film-like tone curve
   */
  film: (): CurveChannel => ({
    rgb: [
      { x: 0, y: 0 },
      { x: 32, y: 28 },
      { x: 64, y: 55 },
      { x: 128, y: 135 },
      { x: 192, y: 210 },
      { x: 224, y: 235 },
      { x: 255, y: 255 }
    ],
    red: [
      { x: 0, y: 0 },
      { x: 128, y: 132 },
      { x: 255, y: 255 }
    ],
    blue: [
      { x: 0, y: 0 },
      { x: 128, y: 124 },
      { x: 255, y: 255 }
    ]
  }),
  
  /**
   * Fade/Matte effect
   */
  fade: (): CurveChannel => ({
    rgb: [
      { x: 0, y: 30 },
      { x: 128, y: 140 },
      { x: 255, y: 245 }
    ]
  }),
  
  /**
   * Cross-process effect
   */
  crossProcess: (): CurveChannel => ({
    red: [
      { x: 0, y: 0 },
      { x: 64, y: 45 },
      { x: 128, y: 140 },
      { x: 255, y: 255 }
    ],
    green: [
      { x: 0, y: 0 },
      { x: 64, y: 70 },
      { x: 128, y: 125 },
      { x: 192, y: 200 },
      { x: 255, y: 255 }
    ],
    blue: [
      { x: 0, y: 20 },
      { x: 64, y: 80 },
      { x: 128, y: 120 },
      { x: 255, y: 235 }
    ]
  })
};

// Type augmentation for TypeScript
declare module 'konva/lib/Node' {
  interface Node {
    curves: (value?: CurveChannel) => CurveChannel | this;
  }
}

declare module 'konva/lib/Shape' {
  interface Shape {
    curves: (value?: CurveChannel) => CurveChannel | this;
  }
}
