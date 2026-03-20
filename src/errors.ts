export class ActionInputError extends Error {
  readonly code = 'ACTION_INPUT_ERROR'

  constructor(message: string) {
    super(message)
    this.name = 'ActionInputError'
  }
}
