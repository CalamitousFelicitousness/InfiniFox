/**
 * Spring Animation System for Multi-Selection
 * Provides smooth, physics-based animations for selection interactions
 */

import Konva from 'konva'
import { useRef, useEffect, useCallback } from 'react'

/**
 * Spring configuration presets
 */
export const SpringPresets = {
  gentle: { stiffness: 120, damping: 14 },
  wobbly: { stiffness: 180, damping: 12 },
  stiff: { stiffness: 210, damping: 20 },
  slow: { stiffness: 280, damping: 60 },
  molasses: { stiffness: 280, damping: 120 },
  quick: { stiffness: 400, damping: 40 },
  bouncy: { stiffness: 500, damping: 15 },
  custom: { stiffness: 300, damping: 25 },
} as const

export type SpringPreset = keyof typeof SpringPresets

interface SpringConfig {
  stiffness: number
  damping: number
  mass?: number
  initialVelocity?: number
  clamp?: boolean
  precision?: number
}

interface SpringValue {
  value: number
  velocity: number
}

/**
 * Calculate spring physics
 */
function calculateSpring(
  current: SpringValue,
  target: number,
  config: SpringConfig,
  deltaTime: number
): SpringValue {
  const { stiffness, damping, mass = 1, clamp = false, precision = 0.01 } = config

  // Spring force: F = -k * x
  const springForce = -stiffness * (current.value - target)

  // Damping force: F = -c * v
  const dampingForce = -damping * current.velocity

  // Total force
  const force = springForce + dampingForce

  // Acceleration: a = F / m
  const acceleration = force / mass

  // Update velocity: v = v + a * dt
  const velocity = current.velocity + acceleration * deltaTime

  // Update position: x = x + v * dt
  const value = current.value + velocity * deltaTime

  // Check if we should clamp to target
  if (clamp && Math.abs(value - target) < precision && Math.abs(velocity) < precision) {
    return { value: target, velocity: 0 }
  }

  return { value, velocity }
}

/**
 * Spring animation hook for single value
 */
export function useSpring(initialValue: number, config: SpringConfig | SpringPreset = 'gentle') {
  const springConfig = typeof config === 'string' ? SpringPresets[config] : config
  const currentRef = useRef<SpringValue>({ value: initialValue, velocity: 0 })
  const targetRef = useRef(initialValue)
  const animationRef = useRef<number | null>(null)
  const callbackRef = useRef<((value: number) => void) | null>(null)

  const animate = useCallback(() => {
    const current = currentRef.current
    const target = targetRef.current

    // Check if animation is complete
    if (Math.abs(current.value - target) < 0.01 && Math.abs(current.velocity) < 0.01) {
      currentRef.current = { value: target, velocity: 0 }
      callbackRef.current?.(target)
      animationRef.current = null
      return
    }

    // Calculate spring physics
    const deltaTime = 1 / 60 // 60 FPS
    const next = calculateSpring(current, target, springConfig, deltaTime)
    currentRef.current = next

    // Trigger callback
    callbackRef.current?.(next.value)

    // Continue animation
    animationRef.current = requestAnimationFrame(animate)
  }, [springConfig])

  const setValue = useCallback(
    (value: number, onChange?: (value: number) => void) => {
      targetRef.current = value
      callbackRef.current = onChange || null

      if (!animationRef.current) {
        animationRef.current = requestAnimationFrame(animate)
      }
    },
    [animate]
  )

  const stop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  const reset = useCallback(
    (value: number) => {
      stop()
      currentRef.current = { value, velocity: 0 }
      targetRef.current = value
    },
    [stop]
  )

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return {
    value: currentRef.current.value,
    setValue,
    stop,
    reset,
  }
}

/**
 * Spring animation hook for multiple values
 */
export function useSprings<T extends Record<string, number>>(
  initialValues: T,
  config: SpringConfig | SpringPreset = 'gentle'
) {
  const springConfig = typeof config === 'string' ? SpringPresets[config] : config
  const springsRef = useRef<Record<string, SpringValue>>({})
  const targetsRef = useRef<T>({ ...initialValues })
  const animationRef = useRef<number | null>(null)
  const callbackRef = useRef<((values: T) => void) | null>(null)

  // Initialize springs
  if (Object.keys(springsRef.current).length === 0) {
    for (const key in initialValues) {
      springsRef.current[key] = { value: initialValues[key], velocity: 0 }
    }
  }

  const animate = useCallback(() => {
    const springs = springsRef.current
    const targets = targetsRef.current
    let isComplete = true
    const values: Record<string, number> = {}

    for (const key in springs) {
      const current = springs[key]
      const target = targets[key as keyof T]

      // Check if this spring is complete
      if (Math.abs(current.value - target) >= 0.01 || Math.abs(current.velocity) >= 0.01) {
        isComplete = false

        // Calculate spring physics
        const deltaTime = 1 / 60
        const next = calculateSpring(current, target, springConfig, deltaTime)
        springs[key] = next
        values[key] = next.value
      } else {
        springs[key] = { value: target, velocity: 0 }
        values[key] = target
      }
    }

    // Trigger callback
    callbackRef.current?.(values)

    // Continue or stop animation
    if (!isComplete) {
      animationRef.current = requestAnimationFrame(animate)
    } else {
      animationRef.current = null
    }
  }, [springConfig])

  const setValues = useCallback(
    (values: Partial<T>, onChange?: (values: T) => void) => {
      for (const key in values) {
        targetsRef.current[key] = values[key]!
      }
      callbackRef.current = onChange || null

      if (!animationRef.current) {
        animationRef.current = requestAnimationFrame(animate)
      }
    },
    [animate]
  )

  const stop = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  const reset = useCallback(
    (values: T) => {
      stop()
      for (const key in values) {
        springsRef.current[key] = { value: values[key], velocity: 0 }
        targetsRef.current[key] = values[key]
      }
    },
    [stop]
  )

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  const getCurrentValues = (): T => {
    const values: Record<string, number> = {}
    for (const key in springsRef.current) {
      values[key] = springsRef.current[key].value
    }
    return values
  }

  return {
    values: getCurrentValues(),
    setValues,
    stop,
    reset,
  }
}

/**
 * Spring animation for Konva nodes
 */
export function useKonvaSpring(
  node: Konva.Node | null,
  config: SpringConfig | SpringPreset = 'gentle'
) {
  const springs = useSprings(
    {
      x: node?.x() || 0,
      y: node?.y() || 0,
      scaleX: node?.scaleX() || 1,
      scaleY: node?.scaleY() || 1,
      rotation: node?.rotation() || 0,
      opacity: node?.opacity() || 1,
    },
    config
  )

  useEffect(() => {
    if (!node) return

    springs.setValues(
      {
        x: node.x(),
        y: node.y(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
        rotation: node.rotation(),
        opacity: node.opacity(),
      },
      (values) => {
        node.setAttrs(values)
        node.getLayer()?.batchDraw()
      }
    )

    return () => {
      springs.stop()
    }
  }, [node, springs])

  const animateTo = useCallback(
    (
      attrs: Partial<{
        x: number
        y: number
        scaleX: number
        scaleY: number
        rotation: number
        opacity: number
      }>
    ) => {
      springs.setValues(attrs, (values) => {
        if (node) {
          node.setAttrs(values)
          node.getLayer()?.batchDraw()
        }
      })
    },
    [node, springs]
  )

  return {
    animateTo,
    stop: springs.stop,
    reset: springs.reset,
  }
}

/**
 * Selection box spring animation
 */
export function useSelectionBoxSpring(config: SpringConfig | SpringPreset = 'quick') {
  const springs = useSprings(
    {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      opacity: 0,
    },
    config
  )

  const show = useCallback(
    (bounds: { x: number; y: number; width: number; height: number }) => {
      springs.setValues({
        ...bounds,
        opacity: 1,
      })
    },
    [springs]
  )

  const hide = useCallback(() => {
    springs.setValues({ opacity: 0 })
  }, [springs])

  const update = useCallback(
    (bounds: { x: number; y: number; width: number; height: number }) => {
      springs.setValues(bounds)
    },
    [springs]
  )

  return {
    ...springs.values,
    show,
    hide,
    update,
  }
}

/**
 * Multi-selection transform spring animation
 */
export function useMultiTransformSpring(
  selectedNodes: Konva.Node[],
  _config: SpringConfig | SpringPreset = 'gentle'
) {
  const initialPositions = useRef<Map<string, { x: number; y: number }>>(new Map())
  const springs = useRef<Map<string, ReturnType<typeof useSprings>>>(new Map())

  useEffect(() => {
    // Initialize springs for new nodes
    selectedNodes.forEach((node) => {
      const id = node.id()
      if (!springs.current.has(id)) {
        springs.current.set(id, {
          values: { x: node.x(), y: node.y() },
          setValues: () => {},
          stop: () => {},
          reset: () => {},
        })
        initialPositions.current.set(id, { x: node.x(), y: node.y() })
      }
    })

    // Clean up springs for removed nodes
    const currentIds = new Set(selectedNodes.map((n) => n.id()))
    springs.current.forEach((_, id) => {
      if (!currentIds.has(id)) {
        springs.current.delete(id)
        initialPositions.current.delete(id)
      }
    })
  }, [selectedNodes])

  const animateToPositions = useCallback(
    (positions: Map<string, { x: number; y: number }>) => {
      positions.forEach((pos, id) => {
        const spring = springs.current.get(id)
        const node = selectedNodes.find((n) => n.id() === id)

        if (spring && node) {
          spring.setValues(pos, (values) => {
            node.setAttrs(values)
            node.getLayer()?.batchDraw()
          })
        }
      })
    },
    [selectedNodes]
  )

  const reset = useCallback(() => {
    initialPositions.current.forEach((pos, id) => {
      const spring = springs.current.get(id)
      const node = selectedNodes.find((n) => n.id() === id)

      if (spring && node) {
        spring.reset(pos)
        node.setAttrs(pos)
        node.getLayer()?.batchDraw()
      }
    })
  }, [selectedNodes])

  return {
    animateToPositions,
    reset,
  }
}
