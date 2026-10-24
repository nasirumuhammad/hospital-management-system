import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/enums/audit-action.enum';
import { AuditTarget } from '../common/enums/audit-target.enum';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UsersService } from './users.service';

const PROFILE_TABLES = ['patients', 'doctors', 'staff_members'] as const;

/**
 * Deletes a sign-in account without touching the person's record.
 *
 * Patient, doctor and staff profiles are only unlinked (userId -> NULL), so they stay, can be given a new login later,
 * and everything they own is untouched. The account row itself is soft-deleted rather than erased because past work
 * (triage, payments, dispensing, audit entries...) points at it; keeping it means that history still says who did what.
 */
@Injectable()
export class AccountRemovalService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly users: UsersService,
    private readonly audit: AuditService,
  ) {}

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    if (id === actor.id) throw new BadRequestException('You cannot delete your own account');
    if (!actor.hospitalId) throw new NotFoundException('A hospital must be selected for this operation');
    const user = await this.users.getByIdOrFail(id);
    if (user.hospitalId !== actor.hospitalId) throw new NotFoundException('Account not found');
    if (user.role === UserRole.SUPER_ADMIN) throw new BadRequestException('Platform accounts cannot be deleted here');

    const unlinked: string[] = [];
    await this.dataSource.transaction(async (manager) => {
      for (const table of PROFILE_TABLES) {
        const rows: unknown[] = await manager.query(
          `UPDATE "${table}" SET "userId" = NULL, "updatedAt" = now() WHERE "userId" = $1 AND "hospitalId" = $2 RETURNING "id"`,
          [id, user.hospitalId],
        ).then(([result]: [unknown[]]) => result);
        if (rows.length > 0) unlinked.push(table);
      }
      await manager.query(`DELETE FROM "refresh_tokens" WHERE "userId" = $1`, [id]);
      await manager.query(`DELETE FROM "user_tokens" WHERE "userId" = $1`, [id]);
      // Free the e-mail address so the person can be given a new account, and make sure the old one can never sign in.
      await manager.query(
        `UPDATE "staff_users" SET "isActive" = false, "tokenVersion" = "tokenVersion" + 1, "email" = $2, "deletedAt" = now(), "updatedAt" = now() WHERE "id" = $1`,
        [id, `deleted+${id}@deleted.invalid`],
      );
    });

    await this.audit.record({
      hospitalId: actor.hospitalId,
      actorId: actor.id,
      action: AuditAction.USER_DELETED,
      targetType: AuditTarget.USER,
      targetId: id,
      metadata: { role: user.role, profilesUnlinked: unlinked },
    });
  }
}
