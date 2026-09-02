export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: unknown) {
    super('validation', message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource}_not_found`, `${resource} não encontrado`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(code = 'unauthorized') {
    super(code, 'Não autorizado', 401);
  }
}

/**
 * Detecta violação de constraint UNIQUE do Prisma (P2002).
 */
export function isPrismaUniqueViolation(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    'code' in e &&
    (e as { code: string }).code === 'P2002'
  );
}
