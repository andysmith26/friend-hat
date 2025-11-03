type Command = 
  | { type: 'ASSIGN_STUDENT', studentId: string, groupId: string, previousGroupId?: string }
  | { type: 'UNASSIGN_STUDENT', studentId: string, previousGroupId: string }
  // More commands can be added later

interface CommandStore {
  history: Command[]
  historyIndex: number
  dispatch(cmd: Command): void
  undo(): void
  redo(): void
  canUndo: boolean
  canRedo: boolean
}