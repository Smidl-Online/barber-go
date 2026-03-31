import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: err.statusCode,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  if (err instanceof ZodError || err.name === 'ZodError') {
    const zodErr = err as ZodError;
    const errors: Record<string, string[]> = {};
    zodErr.errors.forEach((e) => {
      const path = e.path.join('.');
      if (!errors[path]) errors[path] = [];
      errors[path].push(e.message);
    });
    res.status(400).json({
      status: 400,
      message: 'Chyba validace',
      errors,
    });
    return;
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    console.error('Prisma error:', err.code, err.message);
    if (err.code === 'P2002') {
      res.status(409).json({
        status: 409,
        message: 'Záznam s těmito údaji již existuje',
      });
      return;
    }
    if (err.code === 'P2003') {
      res.status(400).json({
        status: 400,
        message: 'Odkazovaný záznam neexistuje',
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        status: 404,
        message: 'Záznam nenalezen',
      });
      return;
    }
    res.status(400).json({
      status: 400,
      message: 'Chyba databáze',
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    console.error('Prisma validation error:', err.message);
    res.status(400).json({
      status: 400,
      message: 'Neplatná data pro databázi',
    });
    return;
  }

  console.error('Unexpected error:', err);
  res.status(500).json({
    status: 500,
    message: 'Interní chyba serveru',
  });
}
