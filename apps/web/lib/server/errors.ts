export function notFoundError(message: string): Error {
  return Object.assign(new Error(message), { code: 'NOT_FOUND' })
}

export function validationError(message: string): Error {
  return Object.assign(new Error(message), { code: 'VALIDATION' })
}
