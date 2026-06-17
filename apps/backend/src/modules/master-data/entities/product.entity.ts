import { ProductStatus, UnitOfMeasure } from '@tejas96/shared/types';
import { Column, DeleteDateColumn, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { BrandEntity } from './brand.entity';
import { ProductTypeEntity } from './product-type.entity';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrganizationEntity } from '../../organizations/entities/organization.entity';
import { UserEntity } from '../../users/entities/user.entity';

@Entity('products')
@Index(['organizationId', 'code'], { unique: true })
@Index(['organizationId', 'status', 'deletedAt'])
@Index(['productTypeId', 'status'])
@Index(['brandId'])
export class ProductEntity extends BaseEntity {
  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId!: string;

  @Column({ name: 'product_type_id', type: 'uuid' })
  productTypeId!: string;

  @Column({ name: 'brand_id', type: 'uuid' })
  brandId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100 })
  code!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'model_number', type: 'varchar', length: 100, nullable: true })
  modelNumber?: string;

  @Column({ type: 'jsonb', default: '{}' })
  specifications!: Record<string, unknown>;

  @Column({
    name: 'unit_of_measure',
    type: 'varchar',
    length: 20,
    default: UnitOfMeasure.PIECES,
  })
  unitOfMeasure!: UnitOfMeasure;

  @Column({ name: 'product_warranty_years', type: 'integer', nullable: true })
  productWarrantyYears?: number;

  @Column({ name: 'performance_warranty_years', type: 'integer', nullable: true })
  performanceWarrantyYears?: number;

  @Column({
    type: 'varchar',
    length: 20,
    default: ProductStatus.ACTIVE,
  })
  status!: ProductStatus;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy?: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  organization?: OrganizationEntity;

  @ManyToOne(() => ProductTypeEntity)
  @JoinColumn({ name: 'product_type_id' })
  productType?: ProductTypeEntity;

  @ManyToOne(() => BrandEntity)
  @JoinColumn({ name: 'brand_id' })
  brand?: BrandEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'created_by' })
  creator?: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'updated_by' })
  updater?: UserEntity;
}
