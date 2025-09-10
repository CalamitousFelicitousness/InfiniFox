/**
 * Shared types for canvas hooks
 * @module types
 */

export interface Position {
  x: number
  y: number
}

export interface ViewportState {
  scale: number
  position: Position
}
