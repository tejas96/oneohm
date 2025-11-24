import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { LoanDocumentType } from '@oneohm-epc/shared-types';
import { plainToInstance } from 'class-transformer';

import { CreateLoanDocumentDto, UpdateLoanDocumentDto, LoanDocumentResponseDto } from '../dto';
import { LoanApplicationRepository } from '../repositories/loan-application.repository';
import { LoanDocumentRepository } from '../repositories/loan-document.repository';

/**
 * Service for Loan Document business logic
 */
@Injectable()
export class LoanDocumentService {
  constructor(
    private readonly loanDocumentRepository: LoanDocumentRepository,
    private readonly loanApplicationRepository: LoanApplicationRepository,
  ) {}

  // ============================================
  // CRUD OPERATIONS
  // ============================================

  async create(createDto: CreateLoanDocumentDto): Promise<LoanDocumentResponseDto> {
    // Validate loan application exists
    const application = await this.loanApplicationRepository.findById(createDto.loanApplicationId);

    if (!application) {
      throw new NotFoundException(
        `Loan application with ID ${createDto.loanApplicationId} not found`,
      );
    }

    const document = await this.loanDocumentRepository.create({
      ...createDto,
      isVerified: false,
    });

    return plainToInstance(LoanDocumentResponseDto, document, {
      excludeExtraneousValues: true,
    });
  }

  async findAll(): Promise<LoanDocumentResponseDto[]> {
    const documents = await this.loanDocumentRepository.findAll();
    return plainToInstance(LoanDocumentResponseDto, documents, {
      excludeExtraneousValues: true,
    });
  }

  async findById(id: string): Promise<LoanDocumentResponseDto> {
    const document = await this.loanDocumentRepository.findById(id);

    if (!document) {
      throw new NotFoundException(`Loan document with ID ${id} not found`);
    }

    return plainToInstance(LoanDocumentResponseDto, document, {
      excludeExtraneousValues: true,
    });
  }

  async update(id: string, updateDto: UpdateLoanDocumentDto): Promise<LoanDocumentResponseDto> {
    const existingDocument = await this.loanDocumentRepository.findById(id);

    if (!existingDocument) {
      throw new NotFoundException(`Loan document with ID ${id} not found`);
    }

    const updated = await this.loanDocumentRepository.update(id, updateDto);

    if (!updated) {
      throw new NotFoundException(`Failed to update loan document with ID ${id}`);
    }

    return plainToInstance(LoanDocumentResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  async delete(id: string): Promise<void> {
    const document = await this.loanDocumentRepository.findById(id);

    if (!document) {
      throw new NotFoundException(`Loan document with ID ${id} not found`);
    }

    const deleted = await this.loanDocumentRepository.delete(id);

    if (!deleted) {
      throw new BadRequestException(`Failed to delete loan document with ID ${id}`);
    }
  }

  // ============================================
  // QUERY METHODS
  // ============================================

  async findByLoanApplication(loanApplicationId: string): Promise<LoanDocumentResponseDto[]> {
    const documents = await this.loanDocumentRepository.findByLoanApplication(loanApplicationId);
    return plainToInstance(LoanDocumentResponseDto, documents, {
      excludeExtraneousValues: true,
    });
  }

  async findByDocumentType(
    loanApplicationId: string,
    documentType: LoanDocumentType,
  ): Promise<LoanDocumentResponseDto[]> {
    const documents = await this.loanDocumentRepository.findByDocumentType(
      loanApplicationId,
      documentType,
    );
    return plainToInstance(LoanDocumentResponseDto, documents, {
      excludeExtraneousValues: true,
    });
  }

  async findVerified(loanApplicationId: string): Promise<LoanDocumentResponseDto[]> {
    const documents = await this.loanDocumentRepository.findVerified(loanApplicationId);
    return plainToInstance(LoanDocumentResponseDto, documents, {
      excludeExtraneousValues: true,
    });
  }

  async findUnverified(loanApplicationId: string): Promise<LoanDocumentResponseDto[]> {
    const documents = await this.loanDocumentRepository.findUnverified(loanApplicationId);
    return plainToInstance(LoanDocumentResponseDto, documents, {
      excludeExtraneousValues: true,
    });
  }

  async findAllUnverified(): Promise<LoanDocumentResponseDto[]> {
    const documents = await this.loanDocumentRepository.findAllUnverified();
    return plainToInstance(LoanDocumentResponseDto, documents, {
      excludeExtraneousValues: true,
    });
  }

  // ============================================
  // VERIFICATION OPERATIONS
  // ============================================

  async verify(id: string, verifiedBy: string): Promise<LoanDocumentResponseDto> {
    const document = await this.loanDocumentRepository.findById(id);

    if (!document) {
      throw new NotFoundException(`Loan document with ID ${id} not found`);
    }

    if (document.isVerified) {
      throw new BadRequestException('Document is already verified');
    }

    const verified = await this.loanDocumentRepository.verify(id, verifiedBy);

    if (!verified) {
      throw new NotFoundException(`Failed to verify loan document with ID ${id}`);
    }

    return plainToInstance(LoanDocumentResponseDto, verified, {
      excludeExtraneousValues: true,
    });
  }

  async unverify(id: string): Promise<LoanDocumentResponseDto> {
    const document = await this.loanDocumentRepository.findById(id);

    if (!document) {
      throw new NotFoundException(`Loan document with ID ${id} not found`);
    }

    if (!document.isVerified) {
      throw new BadRequestException('Document is not verified');
    }

    const unverified = await this.loanDocumentRepository.unverify(id);

    if (!unverified) {
      throw new NotFoundException(`Failed to unverify loan document with ID ${id}`);
    }

    return plainToInstance(LoanDocumentResponseDto, unverified, {
      excludeExtraneousValues: true,
    });
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getVerificationStats(loanApplicationId: string): Promise<{
    total: number;
    verified: number;
    unverified: number;
    verificationPercentage: number;
  }> {
    return this.loanDocumentRepository.getVerificationStats(loanApplicationId);
  }
}
