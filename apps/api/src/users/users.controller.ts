import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { LinkProfileDto } from './dto/link-profile.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { SetActiveDto } from './dto/set-active.dto';
import { ProfileLinkService } from './profile-link.service';
import { UsersService } from './users.service';

@Controller('users')
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly profileLinks: ProfileLinkService,
  ) {}

  @Get()
  list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.create(dto, actor);
  }

  @Patch(':id/active')
  setActive(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SetActiveDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.users.setActive(id, dto.isActive, actor);
  }

  @Post('link-profile')
  @HttpCode(HttpStatus.OK)
  linkProfile(@Body() dto: LinkProfileDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.profileLinks.link(dto, actor);
  }
}
