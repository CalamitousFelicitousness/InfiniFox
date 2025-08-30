import { create } from 'zustand'

// Command interface for history actions
interface Command {
  id: string
  type: string
  timestamp: number
  execute: () => void
  undo: () => void
  description: string
}

// Specific command types
class AddImageCommand implements Command {
  id: string
  type = 'ADD_IMAGE'
  timestamp: number
  description: string
  private image: any
  private store: any

  constructor(image: any, store: any) {
    this.id = `cmd-${Date.now()}-${Math.random()}`
    this.timestamp = Date.now()
    this.image = image
    this.store = store
    this.description = `Add image`
  }

  execute() {
    this.store.getState().addImageDirect(this.image)
  }

  undo() {
    this.store.getState().removeImageDirect(this.image.id)
  }
}

class RemoveImageCommand implements Command {
  id: string
  type = 'REMOVE_IMAGE'
  timestamp: number
  description: string
  private image: any
  private store: any

  constructor(image: any, store: any) {
    this.id = `cmd-${Date.now()}-${Math.random()}`
    this.timestamp = Date.now()
    this.image = image
    this.store = store
    this.description = `Remove image`
  }

  execute() {
    this.store.getState().removeImageDirect(this.image.id)
  }

  undo() {
    this.store.getState().addImageDirect(this.image)
  }
}

class MoveImageCommand implements Command {
  id: string
  type = 'MOVE_IMAGE'
  timestamp: number
  description: string
  private imageId: string
  private oldPos: { x: number; y: number }
  private newPos: { x: number; y: number }
  private store: any

  constructor(imageId: string, oldPos: { x: number; y: number }, newPos: { x: number; y: number }, store: any) {
    this.id = `cmd-${Date.now()}-${Math.random()}`
    this.timestamp = Date.now()
    this.imageId = imageId
    this.oldPos = oldPos
    this.newPos = newPos
    this.store = store
    this.description = `Move image`
  }

  execute() {
    this.store.getState().updateImagePositionDirect(this.imageId, this.newPos.x, this.newPos.y)
  }

  undo() {
    this.store.getState().updateImagePositionDirect(this.imageId, this.oldPos.x, this.oldPos.y)
  }
}

class BatchCommand implements Command {
  id: string
  type = 'BATCH'
  timestamp: number
  description: string
  private commands: Command[]

  constructor(commands: Command[], description: string) {
    this.id = `cmd-${Date.now()}-${Math.random()}`
    this.timestamp = Date.now()
    this.commands = commands
    this.description = description
  }

  execute() {
    this.commands.forEach(cmd => cmd.execute())
  }

  undo() {
    // Undo in reverse order
    this.commands.slice().reverse().forEach(cmd => cmd.undo())
  }
}

interface HistoryState {
  history: Command[]
  currentIndex: number
  maxHistorySize: number
  canUndo: boolean
  canRedo: boolean

  executeCommand: (command: Command) => void
  undo: () => void
  redo: () => void
  clearHistory: () => void
  getHistoryList: () => { id: string; description: string; timestamp: number; isCurrent: boolean }[]
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],
  currentIndex: -1,
  maxHistorySize: 50,
  canUndo: false,
  canRedo: false,

  executeCommand: (command: Command) => {
    const { history, currentIndex, maxHistorySize } = get()
    
    // Remove any commands after current index (lose redo history)
    const newHistory = history.slice(0, currentIndex + 1)
    
    // Add new command
    newHistory.push(command)
    
    // Execute the command
    command.execute()
    
    // Trim history if too long
    if (newHistory.length > maxHistorySize) {
      newHistory.shift()
    }
    
    const newIndex = newHistory.length - 1
    
    set({
      history: newHistory,
      currentIndex: newIndex,
      canUndo: newIndex >= 0,
      canRedo: false,
    })
  },

  undo: () => {
    const { history, currentIndex } = get()
    
    if (currentIndex >= 0) {
      const command = history[currentIndex]
      command.undo()
      
      const newIndex = currentIndex - 1
      
      set({
        currentIndex: newIndex,
        canUndo: newIndex >= 0,
        canRedo: true,
      })
    }
  },

  redo: () => {
    const { history, currentIndex } = get()
    
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1
      const command = history[newIndex]
      command.execute()
      
      set({
        currentIndex: newIndex,
        canUndo: true,
        canRedo: newIndex < history.length - 1,
      })
    }
  },

  clearHistory: () => {
    set({
      history: [],
      currentIndex: -1,
      canUndo: false,
      canRedo: false,
    })
  },

  getHistoryList: () => {
    const { history, currentIndex } = get()
    return history.map((cmd, index) => ({
      id: cmd.id,
      description: cmd.description,
      timestamp: cmd.timestamp,
      isCurrent: index === currentIndex,
    }))
  },
}))

// Export command classes for use in other stores
export { AddImageCommand, RemoveImageCommand, MoveImageCommand, BatchCommand }
