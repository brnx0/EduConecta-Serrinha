import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  isPrismaUniqueViolation,
} from '../../src/lib/errors.js';

describe('AppError', () => {
  it('captura code, message e statusCode', () => {
    const err = new AppError('test', 'ouch', 418);
    expect(err.code).toBe('test');
    expect(err.message).toBe('ouch');
    expect(err.statusCode).toBe(418);
  });
});

describe('ValidationError', () => {
  it('gera com code=validation e statusCode=400', () => {
    const err = new ValidationError('falhou', { field: 'a' });
    expect(err.code).toBe('validation');
    expect(err.statusCode).toBe(400);
    expect(err.details).toEqual({ field: 'a' });
  });
});

describe('NotFoundError', () => {
  it('inclui resource no code', () => {
    const err = new NotFoundError('aluno');
    expect(err.code).toBe('aluno_not_found');
    expect(err.statusCode).toBe(404);
  });
});

describe('UnauthorizedError', () => {
  it('default code unauthorized', () => {
    const err = new UnauthorizedError();
    expect(err.code).toBe('unauthorized');
    expect(err.statusCode).toBe(401);
  });
});

describe('isPrismaUniqueViolation', () => {
  it('detecta P2002', () => {
    expect(isPrismaUniqueViolation({ code: 'P2002' })).toBe(true);
  });
  it('rejeita outros códigos', () => {
    expect(isPrismaUniqueViolation({ code: 'P2003' })).toBe(false);
    expect(isPrismaUniqueViolation(new Error('x'))).toBe(false);
    expect(isPrismaUniqueViolation(null)).toBe(false);
    expect(isPrismaUniqueViolation(undefined)).toBe(false);
  });
});
