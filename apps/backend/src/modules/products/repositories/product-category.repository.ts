import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

import { ProductCategoryEntity } from '../entities/product-category.entity';

/**
 * Product Category Repository
 * Handles database operations for product categories
 */
@Injectable()
export class ProductCategoryRepository {
  constructor(
    @InjectRepository(ProductCategoryEntity)
    private readonly repository: Repository<ProductCategoryEntity>,
  ) {}

  /**
   * Create a new product category
   */
  async create(
    organizationId: string,
    categoryData: Partial<ProductCategoryEntity>,
  ): Promise<ProductCategoryEntity> {
    const category = this.repository.create({
      ...categoryData,
      organizationId,
    });
    return this.repository.save(category);
  }

  /**
   * Find all categories for an organization
   * Returns hierarchical structure with child categories
   */
  async findAll(organizationId: string): Promise<ProductCategoryEntity[]> {
    return this.repository.find({
      where: {
        organizationId,
        deletedAt: IsNull(),
      },
      relations: ['childCategories'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find top-level categories (no parent)
   */
  async findTopLevel(organizationId: string): Promise<ProductCategoryEntity[]> {
    return this.repository.find({
      where: {
        organizationId,
        parentCategoryId: IsNull(),
        deletedAt: IsNull(),
      },
      relations: ['childCategories'],
      order: {
        name: 'ASC',
      },
    });
  }

  /**
   * Find category by ID
   */
  async findById(id: string, organizationId: string): Promise<ProductCategoryEntity | null> {
    return this.repository.findOne({
      where: {
        id,
        organizationId,
        deletedAt: IsNull(),
      },
      relations: ['childCategories', 'parentCategory'],
    });
  }

  /**
   * Find category by code
   */
  async findByCode(code: string, organizationId: string): Promise<ProductCategoryEntity | null> {
    return this.repository.findOne({
      where: {
        code,
        organizationId,
        deletedAt: IsNull(),
      },
    });
  }

  /**
   * Update category
   */
  async update(
    id: string,
    organizationId: string,
    categoryData: Partial<ProductCategoryEntity>,
  ): Promise<ProductCategoryEntity> {
    await this.repository.update(
      { id, organizationId },
      {
        ...categoryData,
        updatedAt: new Date(),
      },
    );

    const updated = await this.findById(id, organizationId);
    if (!updated) {
      throw new Error('Category not found after update');
    }
    return updated;
  }

  /**
   * Soft delete category
   */
  async softDelete(id: string, organizationId: string): Promise<void> {
    await this.repository.update(
      { id, organizationId },
      {
        deletedAt: new Date(),
      },
    );
  }

  /**
   * Get category hierarchy tree
   * Returns full tree structure starting from top-level categories
   */
  async getCategoryTree(organizationId: string): Promise<ProductCategoryEntity[]> {
    const topLevel = await this.findTopLevel(organizationId);

    // Recursively load children
    for (const category of topLevel) {
      await this.loadChildren(category);
    }

    return topLevel;
  }

  /**
   * Recursively load child categories
   */
  private async loadChildren(category: ProductCategoryEntity): Promise<void> {
    const children = await this.repository.find({
      where: {
        parentCategoryId: category.id,
        deletedAt: IsNull(),
      },
      order: {
        name: 'ASC',
      },
    });

    category.childCategories = children;

    for (const child of children) {
      await this.loadChildren(child);
    }
  }
}
