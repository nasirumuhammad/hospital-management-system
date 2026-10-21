import { Column, Entity, Index } from 'typeorm';
import { AbstractEntity } from '../../common/entities/abstract.entity';

@Entity('hospitals')
@Index('UQ_hospitals_slug', ['slug'], { unique: true })
export class Hospital extends AbstractEntity {
  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 60 })
  slug: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'varchar', length: 10, default: 'CP' })
  patientNumberPrefix: string;

  @Column({ type: 'smallint' })
  patientNumberYear: number;

  @Column({ type: 'integer', default: 1 })
  nextPatientNumber: number;

  @Column({ type: 'integer', default: 0 })
  lastVisitNumber: number;

  @Column({ type: 'date', nullable: true })
  lastVisitDate: string | null;
}
