import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { ProductCategoryEntity } from '../entities/product-category.entity';
import { ProductCategoryRepository } from '../repositories/product-category.repository';
import type { CreateProductCategoryDto, UpdateProductCategoryDto } from '../dto/product-categories';

/**
 * Product Category Service
 * Business logic for product category management
 */
@Injectable()
export class ProductCategoryService {
  constructor(private readonly categoryRepository: ProductCategoryRepository) {}

  /**
   * Create a new product category
   */
  async create(
    organizationId: string,
    createDto: CreateProductCategoryDto,
    createdBy?: string,
  ): Promise<ProductCategoryEntity> {
    // Check if code already exists
    const existing = await this.categoryRepository.findByCode(createDto.code, organizationId);
    if (existing) {
      throw new ConflictException(`Category with code '${createDto.code}' already exists`);
    }

    // Validate parent category exists if provided
    if (createDto.parentCategoryId) {
      const parent = await this.categoryRepository.findById(
        createDto.parentCategoryId,
        organizationId,
      );
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }

      // Check depth limit (max 3 levels)
      await this.validateCategoryDepth(parent, organizationId);
    }

    return this.categoryRepository.create(organizationId, {
      ...createDto,
      createdBy,
    });
  }

  /**
   * Get all categories (flat list)
   */
  async findAll(organizationId: string): Promise<ProductCategoryEntity[]> {
    return this.categoryRepository.findAll(organizationId);
  }

  /**
   * Get category hierarchy tree
   */
  async getCategoryTree(organizationId: string): Promise<ProductCategoryEntity[]> {
    return this.categoryRepository.getCategoryTree(organizationId);
  }

  /**
   * Get top-level categories only
   */
  async getTopLevel(organizationId: string): Promise<ProductCategoryEntity[]> {
    return this.categoryRepository.findTopLevel(organizationId);
  }

  /**
   * Get category by ID
   */
  async findById(id: string, organizationId: string): Promise<ProductCategoryEntity> {
    const category = await this.categoryRepository.findById(id, organizationId);
    if (!category) {
      throw new NotFoundException('Product category not found');
    }
    return category;
  }

  /**
   * Update category
   */
  async update(
    id: string,
    organizationId: string,
    updateDto: UpdateProductCategoryDto,
    updatedBy?: string,
  ): Promise<ProductCategoryEntity> {
    const category = await this.findById(id, organizationId);

    // Check code uniqueness if changing
    if (updateDto.code && updateDto.code !== category.code) {
      const existing = await this.categoryRepository.findByCode(updateDto.code, organizationId);
      if (existing) {
        throw new ConflictException(`Category with code '${updateDto.code}' already exists`);
      }
    }

    // Validate parent category if changing
    if (updateDto.parentCategoryId !== undefined) {
      if (updateDto.parentCategoryId) {
        // Check parent exists
        const parent = await this.categoryRepository.findById(
          updateDto.parentCategoryId,
          organizationId,
        );
        if (!parent) {
          throw new NotFoundException('Parent category not found');
        }

        // Prevent circular reference
        if (updateDto.parentCategoryId === id) {
          throw new BadRequestException('Category cannot be its own parent');
        }

        // Check depth limit
        await this.validateCategoryDepth(parent, organizationId);
      }
    }

    return this.categoryRepository.update(id, organizationId, {
      ...updateDto,
      updatedBy,
    });
  }

  /**
   * Delete category (soft delete)
   */
  async delete(id: string, organizationId: string): Promise<void> {
    const category = await this.findById(id, organizationId);

    // Check if category has children
    if (category.childCategories && category.childCategories.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with child categories. Delete children first.',
      );
    }

    await this.categoryRepository.softDelete(id, organizationId);
  }

  /**
   * Validate category depth (max 3 levels)
   */
  private async validateCategoryDepth(
    parent: ProductCategoryEntity,
    organizationId: string,
  ): Promise<void> {
    let depth = 1;
    let current = parent;

    while (current.parentCategoryId) {
      depth++;
      if (depth >= 3) {
        throw new BadRequestException(
          'Maximum category depth is 3 levels (Category → Subcategory → Product Type)',
        );
      }

      const nextParent = await this.categoryRepository.findById(
        current.parentCategoryId,
        organizationId,
      );
      if (!nextParent) break;
      current = nextParent;
    }
  }
}

