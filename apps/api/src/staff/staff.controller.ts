import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { CreateStaffMemberDto } from './dto/create-staff-member.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import { UpdateStaffMemberDto } from './dto/update-staff-member.dto';
import { StaffService } from './staff.service';

@Controller('staff')
@Roles(UserRole.ADMIN)
export class StaffController {
  constructor(private readonly staff: StaffService) {}

  @Get()
  list(@Query() query: ListStaffQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.staff.list(query, actor);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.staff.findOrFail(id, actor);
  }

  @Post()
  create(@Body() dto: CreateStaffMemberDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.staff.create(dto, actor);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateStaffMemberDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.staff.update(id, dto, actor);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.staff.remove(id, actor);
  }
}
