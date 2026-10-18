import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AUTH_ERROR, ACCESS_COOKIE_NAME } from '../../common/constants/auth.constants';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { AuthenticatedRequest, AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import { UsersService } from '../../users/users.service';
import { AccessTokenService } from '../access-token.service';

const BEARER_SCHEME = 'Bearer';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokens: AccessTokenService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException(AUTH_ERROR.SESSION_INVALID);
    request.user = await this.authenticate(token);
    return true;
  }

  private isPublic(context: ExecutionContext): boolean {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]) === true;
  }

  private extractToken(request: AuthenticatedRequest): string | null {
    const cookieToken = request.cookies?.[ACCESS_COOKIE_NAME];
    if (typeof cookieToken === 'string' && cookieToken) return cookieToken;
    const [scheme, bearerToken] = (request.headers.authorization ?? '').split(' ');
    return scheme === BEARER_SCHEME && bearerToken ? bearerToken : null;
  }

  private async authenticate(token: string): Promise<AuthenticatedUser> {
    const payload = await this.accessTokens.verify(token).catch(() => null);
    const user = payload ? await this.users.findActiveById(payload.sub) : null;
    if (!payload || !user || user.tokenVersion !== payload.tv) {
      throw new UnauthorizedException(AUTH_ERROR.SESSION_INVALID);
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
