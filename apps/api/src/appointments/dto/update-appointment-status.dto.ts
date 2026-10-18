import { IsEnum } from 'class-validator';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';

export class UpdateAppointmentStatusDto {
  @IsEnum(AppointmentStatus) status: AppointmentStatus;
}
