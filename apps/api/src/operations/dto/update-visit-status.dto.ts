import { IsIn } from 'class-validator';
export class UpdateVisitStatusDto { @IsIn(['WAITING','IN_TRIAGE','WITH_DOCTOR','AWAITING_SERVICES','COMPLETED','CANCELLED']) status: string; }
