import { Request } from 'express';
import { UserRole } from '../enums/user-role.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  hospitalId: string | null;
}

export type AuthenticatedRequest = Request & { user: AuthenticatedUser };
