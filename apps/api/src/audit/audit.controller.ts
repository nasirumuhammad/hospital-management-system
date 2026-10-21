import { Controller, ForbiddenException, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuditService } from './audit.service';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';

@Controller('audit-logs')
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query() query: ListAuditLogsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    if (!user.hospitalId) throw new ForbiddenException('Platform users must use the platform audit interface');
    return this.audit.list(query, user.hospitalId);
  }
}
