import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { BrandProductTypeEntity } from '../entities';

@Injectable()
export class BrandProductTypeRepository {
  constructor(
    @InjectRepository(BrandProductTypeEntity)
    private readonly repository: Repository<BrandProductTypeEntity>,
  ) {}

  async findActiveByBrandIds(brandIds: string[]): Promise<BrandProductTypeEntity[]> {
    if (brandIds.length === 0) {
      return [];
    }

    return this.repository.find({
      where: {
        brandId: In(brandIds),
        isActive: true,
      },
    });
  }

  async findActiveByBrandId(brandId: string): Promise<BrandProductTypeEntity[]> {
    return this.repository.find({
      where: {
        brandId,
        isActive: true,
      },
    });
  }

  async replaceBrandProductTypes(brandId: string, productTypeIds: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(productTypeIds));
    const nextIds = new Set(uniqueIds);
    const existing = await this.repository.find({
      where: { brandId },
    });
    const existingByType = new Map(existing.map((item) => [item.productTypeId, item]));

    const toDeactivate = existing.filter(
      (item) => item.isActive && !nextIds.has(item.productTypeId),
    );
    if (toDeactivate.length > 0) {
      await this.repository.update(
        { id: In(toDeactivate.map((item) => item.id)) },
        { isActive: false },
      );
    }

    const toSave: BrandProductTypeEntity[] = [];
    uniqueIds.forEach((productTypeId) => {
      const existingItem = existingByType.get(productTypeId);
      if (existingItem) {
        if (!existingItem.isActive) {
          existingItem.isActive = true;
          toSave.push(existingItem);
        }
        return;
      }

      toSave.push(
        this.repository.create({
          brandId,
          productTypeId,
          isActive: true,
        }),
      );
    });

    if (toSave.length > 0) {
      await this.repository.save(toSave);
    }
  }
}
