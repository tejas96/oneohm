import { type GpsCoordinates } from '@tejas96/shared/types';
import { Column, DeleteDateColumn, Entity, Index, OneToMany } from 'typeorm';

import { BaseEntity } from '../../../common/entities/base.entity';
import { CustomerPropertyEntity } from '../../customers/entities/customer-property.entity';

@Entity('discoms')
@Index(['circleName'])
@Index(['divisionName'])
@Index(['sectionName'])
export class DiscomEntity extends BaseEntity {
  @Column({ name: 'circle_name', type: 'varchar', length: 255 })
  circleName!: string;

  @Column({ name: 'circle_incharge_name', type: 'varchar', length: 255 })
  circleInchargeName!: string;

  @Column({ name: 'division_name', type: 'varchar', length: 255 })
  divisionName!: string;

  @Column({ name: 'division_incharge_name', type: 'varchar', length: 255 })
  divisionInchargeName!: string;

  @Column({ name: 'testing_unit_name', type: 'varchar', length: 255, nullable: true })
  testingUnitName?: string;

  @Column({ name: 'subdivision_name', type: 'varchar', length: 255, nullable: true })
  subdivisionName?: string;

  @Column({ name: 'subdivision_incharge_name', type: 'varchar', length: 255, nullable: true })
  subdivisionInchargeName?: string;

  @Column({ name: 'aeqc_engineer_name', type: 'varchar', length: 255, nullable: true })
  aeqcEngineerName?: string;

  @Column({ name: 'section_name', type: 'varchar', length: 255, nullable: true })
  sectionName?: string;

  @Column({ name: 'section_engineer_name', type: 'varchar', length: 255, nullable: true })
  sectionEngineerName?: string;

  @Column({ name: 'office_address', type: 'text', nullable: true })
  officeAddress?: string;

  @Column({ name: 'mobile_no', type: 'varchar', length: 20, nullable: true })
  mobileNo?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string;

  @Column({ name: 'geo_location', type: 'jsonb', nullable: true })
  geoLocation?: GpsCoordinates;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  @OneToMany(() => CustomerPropertyEntity, (property) => property.discom)
  properties?: CustomerPropertyEntity[];
}
