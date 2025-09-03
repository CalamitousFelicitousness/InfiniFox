import Konva from 'konva';

export interface SharpeningConfig {
  amount?: number;        // 0-500, default 100 - Sharpening strength percentage
  radius?: number;        // 0.1-10, default 1 - Radius of sharpening in pixels
  threshold?: number;     // 0-255, default 0 - Minimum brightness change to sharpen
  mode?: 'unsharp' | 'smart' | 'edge'; // default 'unsharp'
  edgeMode?: 'light' | 'dark' | 'both'; // For edge mode, default 'both'
  noiseReduction?: boolean; // For smart mode, default false
}

/**
 * Apply Gaussian blur for unsharp mask
 */
function gaussianBlur(data: Uint8ClampedArray, width: number, height: number, radius: number): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data.length);
  const kernelSize = Math.ceil(radius * 3);
  const sigma = radius / 3;
  
  // Generate Gaussian kernel
  const kernel: number[] = [];
  let kernelSum = 0;
  
  for (let i = -kernelSize; i <= kernelSize; i++) {
    const weight = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(weight);
    kernelSum += weight;
  }
  
  // Normalize kernel
  for (let i = 0; i < kernel.length; i++) {
    kernel[i] /= kernelSum;
  }
  
  // Horizontal pass
  const temp = new Uint8ClampedArray(data.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      
      for (let i = -kernelSize; i <= kernelSize; i++) {
        const sampleX = Math.min(Math.max(0, x + i), width - 1);
        const idx = (y * width + sampleX) * 4;
        const weight = kernel[i + kernelSize];
        
        r += data[idx] * weight;
        g += data[idx + 1] * weight;
        b += data[idx + 2] * weight;
        a += data[idx + 3] * weight;
      }
      
      const idx = (y * width + x) * 4;
      temp[idx] = r;
      temp[idx + 1] = g;
      temp[idx + 2] = b;
      temp[idx + 3] = a;
    }
  }
  
  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      
      for (let i = -kernelSize; i <= kernelSize; i++) {
        const sampleY = Math.min(Math.max(0, y + i), height - 1);
        const idx = (sampleY * width + x) * 4;
        const weight = kernel[i + kernelSize];
        
        r += temp[idx] * weight;
        g += temp[idx + 1] * weight;
        b += temp[idx + 2] * weight;
        a += temp[idx + 3] * weight;
      }
      
      const idx = (y * width + x) * 4;
      output[idx] = r;
      output[idx + 1] = g;
      output[idx + 2] = b;
      output[idx + 3] = a;
    }
  }
  
  return output;
}

/**
 * Detect edges using Sobel operator
 */
function detectEdges(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const edges = new Float32Array(width * height);
  
  // Sobel kernels
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      // Apply Sobel kernels
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          const kernelIdx = (ky + 1) * 3 + (kx + 1);
          
          gx += brightness * sobelX[kernelIdx];
          gy += brightness * sobelY[kernelIdx];
        }
      }
      
      edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  
  return edges;
}

/**
 * Apply median filter for noise reduction
 */
function medianFilter(data: Uint8ClampedArray, width: number, height: number, radius: number = 1): Uint8ClampedArray {
  const output = new Uint8ClampedArray(data.length);
  const windowSize = (radius * 2 + 1) * (radius * 2 + 1);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rValues: number[] = [];
      const gValues: number[] = [];
      const bValues: number[] = [];
      
      // Collect values in window
      for (let wy = -radius; wy <= radius; wy++) {
        for (let wx = -radius; wx <= radius; wx++) {
          const sampleY = Math.min(Math.max(0, y + wy), height - 1);
          const sampleX = Math.min(Math.max(0, x + wx), width - 1);
          const idx = (sampleY * width + sampleX) * 4;
          
          rValues.push(data[idx]);
          gValues.push(data[idx + 1]);
          bValues.push(data[idx + 2]);
        }
      }
      
      // Sort and get median
      rValues.sort((a, b) => a - b);
      gValues.sort((a, b) => a - b);
      bValues.sort((a, b) => a - b);
      
      const medianIdx = Math.floor(windowSize / 2);
      const idx = (y * width + x) * 4;
      
      output[idx] = rValues[medianIdx];
      output[idx + 1] = gValues[medianIdx];
      output[idx + 2] = bValues[medianIdx];
      output[idx + 3] = data[idx + 3]; // Keep alpha
    }
  }
  
  return output;
}

/**
 * Professional Sharpening Filter for Konva
 * Provides multiple sharpening modes including unsharp mask, smart sharpen, and edge enhancement
 * 
 * Usage:
 * image.cache();
 * image.filters([Konva.Filters.Sharpening]);
 * image.sharpening({
 *   amount: 150,
 *   radius: 1.5,
 *   threshold: 3,
 *   mode: 'smart'
 * });
 */
Konva.Filters.Sharpening = function(imageData: ImageData) {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const node = this as any;
  const config = node.sharpening() || {};
  
  // Extract configuration with defaults
  const amount = (config.amount ?? 100) / 100; // Convert to multiplier
  const radius = config.radius ?? 1;
  const threshold = config.threshold ?? 0;
  const mode = config.mode ?? 'unsharp';
  const edgeMode = config.edgeMode ?? 'both';
  const noiseReduction = config.noiseReduction ?? false;
  
  if (amount === 0) return;
  
  let processedData = new Uint8ClampedArray(data);
  
  if (mode === 'unsharp') {
    // Classic Unsharp Mask
    const blurred = gaussianBlur(processedData, width, height, radius);
    
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) { // Process RGB channels
        const original = processedData[i + c];
        const blur = blurred[i + c];
        const diff = original - blur;
        
        // Apply threshold
        if (Math.abs(diff) > threshold) {
          const sharpened = original + diff * amount;
          data[i + c] = Math.max(0, Math.min(255, sharpened));
        } else {
          data[i + c] = original;
        }
      }
    }
    
  } else if (mode === 'smart') {
    // Smart Sharpen - reduces halo effects and preserves edges better
    
    // Optional noise reduction pre-processing
    if (noiseReduction) {
      processedData = medianFilter(processedData, width, height, 1);
    }
    
    // Multi-scale sharpening
    const scales = [radius * 0.5, radius, radius * 1.5];
    const weights = [0.3, 0.5, 0.2];
    
    const sharpened = new Float32Array(data.length);
    
    for (let s = 0; s < scales.length; s++) {
      const blurred = gaussianBlur(processedData, width, height, scales[s]);
      
      for (let i = 0; i < data.length; i += 4) {
        for (let c = 0; c < 3; c++) {
          const original = processedData[i + c];
          const blur = blurred[i + c];
          const diff = original - blur;
          
          // Adaptive sharpening based on local contrast
          const localContrast = Math.abs(diff) / 255;
          const adaptiveAmount = amount * (1 + localContrast);
          
          if (Math.abs(diff) > threshold) {
            sharpened[i + c] += (original + diff * adaptiveAmount * weights[s]);
          } else {
            sharpened[i + c] += original * weights[s];
          }
        }
        sharpened[i + 3] += processedData[i + 3] * weights[s]; // Alpha
      }
    }
    
    // Apply sharpened result
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.max(0, Math.min(255, sharpened[i]));
    }
    
  } else if (mode === 'edge') {
    // Edge Enhancement - sharpens only edges
    const edges = detectEdges(processedData, width, height);
    const blurred = gaussianBlur(processedData, width, height, radius);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const edgeStrength = edges[y * width + x] / 255; // Normalize
        
        for (let c = 0; c < 3; c++) {
          const original = processedData[idx + c];
          const blur = blurred[idx + c];
          const diff = original - blur;
          
          // Check edge mode
          let shouldSharpen = false;
          if (edgeMode === 'both') {
            shouldSharpen = true;
          } else if (edgeMode === 'light' && diff > 0) {
            shouldSharpen = true;
          } else if (edgeMode === 'dark' && diff < 0) {
            shouldSharpen = true;
          }
          
          if (shouldSharpen && edgeStrength > threshold / 255) {
            // Apply sharpening proportional to edge strength
            const sharpened = original + diff * amount * edgeStrength;
            data[idx + c] = Math.max(0, Math.min(255, sharpened));
          } else {
            data[idx + c] = original;
          }
        }
      }
    }
  }
};

// Register the sharpening property
Konva.Factory.addGetterSetter(Konva.Node, 'sharpening', null);

// Preset sharpening configurations
export const SharpeningPresets = {
  /**
   * Subtle sharpening for web display
   */
  subtle: (): SharpeningConfig => ({
    amount: 50,
    radius: 0.5,
    threshold: 1,
    mode: 'unsharp'
  }),
  
  /**
   * Standard sharpening for general use
   */
  standard: (): SharpeningConfig => ({
    amount: 100,
    radius: 1,
    threshold: 2,
    mode: 'unsharp'
  }),
  
  /**
   * Strong sharpening for soft images
   */
  strong: (): SharpeningConfig => ({
    amount: 200,
    radius: 1.5,
    threshold: 3,
    mode: 'unsharp'
  }),
  
  /**
   * Smart sharpening with noise reduction
   */
  smart: (): SharpeningConfig => ({
    amount: 120,
    radius: 1.2,
    threshold: 2,
    mode: 'smart',
    noiseReduction: true
  }),
  
  /**
   * Edge enhancement only
   */
  edgesOnly: (): SharpeningConfig => ({
    amount: 150,
    radius: 1,
    threshold: 5,
    mode: 'edge',
    edgeMode: 'both'
  }),
  
  /**
   * Highlight edges (light edges only)
   */
  highlightEdges: (): SharpeningConfig => ({
    amount: 100,
    radius: 0.8,
    threshold: 3,
    mode: 'edge',
    edgeMode: 'light'
  }),
  
  /**
   * Shadow edges (dark edges only)
   */
  shadowEdges: (): SharpeningConfig => ({
    amount: 100,
    radius: 0.8,
    threshold: 3,
    mode: 'edge',
    edgeMode: 'dark'
  }),
  
  /**
   * Print sharpening (high radius, low amount)
   */
  print: (): SharpeningConfig => ({
    amount: 80,
    radius: 2.5,
    threshold: 4,
    mode: 'smart',
    noiseReduction: false
  }),
  
  /**
   * Extreme sharpening (use with caution)
   */
  extreme: (): SharpeningConfig => ({
    amount: 300,
    radius: 2,
    threshold: 0,
    mode: 'unsharp'
  })
};

// Type augmentation for TypeScript
declare module 'konva/lib/Node' {
  interface Node {
    sharpening: (value?: SharpeningConfig) => SharpeningConfig | this;
  }
}

declare module 'konva/lib/Shape' {
  interface Shape {
    sharpening: (value?: SharpeningConfig) => SharpeningConfig | this;
  }
}
