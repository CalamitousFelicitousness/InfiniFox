import { useEffect, useRef } from 'react'

/**
 * Resource interface - any object with cleanup methods
 */
interface Resource {
  cleanup?: () => void
  dispose?: () => void
  destroy?: () => void
  disconnect?: () => void
  cancel?: () => void
  close?: () => void
}

/**
 * Hook for managing resources with automatic cleanup
 * @param factory Function that creates the resource
 * @param deps Dependency list for recreation
 * @returns The resource instance or null
 */
export function useResource<T extends Resource>(
  factory: () => T,
  deps: React.DependencyList = []
): T | null {
  const resourceRef = useRef<T | null>(null)
  
  useEffect(() => {
    const resource = factory()
    resourceRef.current = resource
    
    return () => {
      const r = resourceRef.current
      if (r) {
        // Try various cleanup method names
        r.cleanup?.()
        r.dispose?.()
        r.destroy?.()
        r.disconnect?.()
        r.cancel?.()
        r.close?.()
        resourceRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  
  return resourceRef.current
}

/**
 * Hook for managing multiple resources with automatic cleanup
 * @param factories Object with factory functions for each resource
 * @param deps Dependency list for recreation
 * @returns Object with resource instances
 */
export function useResources<T extends Record<string, Resource>>(
  factories: { [K in keyof T]: () => T[K] },
  deps: React.DependencyList = []
): T {
  const resourcesRef = useRef<T>({} as T)
  
  useEffect(() => {
    const resources = {} as T
    
    // Create all resources
    for (const key in factories) {
      resources[key] = factories[key]()
    }
    
    resourcesRef.current = resources
    
    return () => {
      // Cleanup all resources
      for (const key in resourcesRef.current) {
        const r = resourcesRef.current[key]
        if (r) {
          r.cleanup?.()
          r.dispose?.()
          r.destroy?.()
          r.disconnect?.()
          r.cancel?.()
          r.close?.()
        }
      }
      resourcesRef.current = {} as T
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  
  return resourcesRef.current
}
