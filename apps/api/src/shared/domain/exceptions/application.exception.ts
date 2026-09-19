export type ApplicationErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT';

export class ApplicationException extends Error {
  constructor(
    readonly code: ApplicationErrorCode,
    message: string,
    readonly field?: string,
  ) {
    super(message);
    this.name = 'ApplicationException';
  }
}
