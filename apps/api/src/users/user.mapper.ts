import { UserRole } from '../common/enums/user-role.enum';
import { User } from './entities/user.entity';

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
}

export function toUserResponse(user: User): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt,
  };
}
