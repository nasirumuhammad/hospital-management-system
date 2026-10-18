import { ArgumentsHost, Catch, ConflictException, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { PG_FOREIGN_KEY_VIOLATION, PG_UNIQUE_VIOLATION } from '../constants/database.constants';

const CONFLICT_MESSAGE: Record<string, string> = {
  [PG_UNIQUE_VIOLATION]: 'A record with these details already exists',
  [PG_FOREIGN_KEY_VIOLATION]: 'This change conflicts with related records',
};

@Catch(QueryFailedError)
export class DatabaseExceptionFilter implements ExceptionFilter {
  catch(error: QueryFailedError & { code?: string }, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const message = error.code ? CONFLICT_MESSAGE[error.code] : undefined;
    if (!message) throw error;
    const conflict = new ConflictException(message);
    response.status(conflict.getStatus()).json(conflict.getResponse());
  }
}
