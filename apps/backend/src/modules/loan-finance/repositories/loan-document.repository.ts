import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoanDocumentType } from '@oneohm-epc/shared-types';
import { Repository } from 'typeorm';

import { LoanDocumentEntity } from '../entities/loan-document.entity';

/**
 * Repository for Loan Documents
 */
@Injectable()
export class LoanDocumentRepository {
  constructor(
    @InjectRepository(LoanDocumentEntity)
    private readonly repository: Repository<LoanDocumentEntity>,
  ) {}

  // ============================================
  // BASIC CRUD
  // ============================================

  async create(document: Partial<LoanDocumentEntity>): Promise<LoanDocumentEntity> {
    const entity = this.repository.create(document);
    return this.repository.save(entity);
  }

  async findAll(): Promise<LoanDocumentEntity[]> {
    return this.repository.find({
      relations: ['loanApplication', 'verifiedByUser', 'createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<LoanDocumentEntity | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['loanApplication', 'verifiedByUser', 'createdByUser'],
    });
  }

  async update(id: string, updateData: Partial<LoanDocumentEntity>): Promise<LoanDocumentEntity | null> {
    await this.repository.update(id, updateData);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async findByLoanApplication(loanApplicationId: string): Promise<LoanDocumentEntity[]> {
    return this.repository.find({
      where: { loanApplicationId },
      relations: ['verifiedByUser', 'createdByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByDocumentType(
    loanApplicationId: string,
    documentType: LoanDocumentType,
  ): Promise<LoanDocumentEntity[]> {
    return this.repository.find({
      where: { loanApplicationId, documentType },
      relations: ['verifiedByUser'],
      order: { createdAt: 'DESC' },
    });
  }

  async findVerified(loanApplicationId: string): Promise<LoanDocumentEntity[]> {
    return this.repository.find({
      where: { loanApplicationId, isVerified: true },
      relations: ['verifiedByUser'],
      order: { verifiedAt: 'DESC' },
    });
  }

  async findUnverified(loanApplicationId: string): Promise<LoanDocumentEntity[]> {
    return this.repository.find({
      where: { loanApplicationId, isVerified: false },
      relations: ['createdByUser'],
      order: { createdAt: 'ASC' },
    });
  }

  async findAllUnverified(): Promise<LoanDocumentEntity[]> {
    return this.repository.find({
      where: { isVerified: false },
      relations: ['loanApplication', 'loanApplication.customer', 'createdByUser'],
      order: { createdAt: 'ASC' },
    });
  }

  // ============================================
  // VERIFICATION
  // ============================================

  async verify(id: string, verifiedBy: string): Promise<LoanDocumentEntity | null> {
    await this.repository.update(id, {
      isVerified: true,
      verifiedBy,
      verifiedAt: new Date(),
    });
    return this.findById(id);
  }

  async unverify(id: string): Promise<LoanDocumentEntity | null> {
    await this.repository.update(id, {
      isVerified: false,
      verifiedBy: null,
      verifiedAt: null,
    });
    return this.findById(id);
  }

  // ============================================
  // STATISTICS
  // ============================================

  async countByLoanApplication(loanApplicationId: string): Promise<number> {
    return this.repository.count({
      where: { loanApplicationId },
    });
  }

  async countVerified(loanApplicationId: string): Promise<number> {
    return this.repository.count({
      where: { loanApplicationId, isVerified: true },
    });
  }

  async countUnverified(loanApplicationId: string): Promise<number> {
    return this.repository.count({
      where: { loanApplicationId, isVerified: false },
    });
  }

  async getVerificationStats(loanApplicationId: string): Promise<{
    total: number;
    verified: number;
    unverified: number;
    verificationPercentage: number;
  }> {
    const total = await this.countByLoanApplication(loanApplicationId);
    const verified = await this.countVerified(loanApplicationId);
    const unverified = await this.countUnverified(loanApplicationId);

    return {
      total,
      verified,
      unverified,
      verificationPercentage: total > 0 ? (verified / total) * 100 : 0,
    };
  }
}

