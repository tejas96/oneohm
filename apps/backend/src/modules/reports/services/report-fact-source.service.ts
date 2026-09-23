import { BadRequestException, Injectable } from '@nestjs/common';
import {
  type FactEditTarget,
  getFact,
  normalizeFactInput,
  type ReportFact,
  validateFactInput,
} from '@tejas96/shared/reports';
import { type ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateCustomerPropertyDto } from '../../customers/dto/update-customer-property.dto';
import { UpdateCustomerDto } from '../../customers/dto/update-customer.dto';
import { CustomerPropertyService } from '../../customers/services/customer-property.service';
import { CustomerService } from '../../customers/services/customer.service';
import type { ProjectEntity } from '../../projects/entities/project.entity';

type EditableFact = ReportFact & { edit: NonNullable<ReportFact['edit']> };

function badRequest(errors: Map<string, string>): BadRequestException {
  return new BadRequestException({
    message: [...errors.values()].join('; '),
    errors: Object.fromEntries(errors),
  });
}

/**
 * Saves customer and site facts edited on the Reports tab through their
 * owner's own update, so every existing rule applies: the owner's DTO,
 * conflict checks, phone/email normalisation, the login sync and the
 * utility-details check.
 */
@Injectable()
export class ReportFactSourceService {
  constructor(
    private readonly customerService: CustomerService,
    private readonly propertyService: CustomerPropertyService,
  ) {}

  async save(
    project: ProjectEntity,
    target: FactEditTarget,
    patch: Record<string, unknown>,
    userId: string,
  ): Promise<void> {
    const payload: Record<string, unknown> = {};
    const factByField = new Map<string, EditableFact>();
    const errors = new Map<string, string>();

    for (const [key, raw] of Object.entries(patch)) {
      const fact = getFact(key) as EditableFact;
      if (raw !== null && typeof raw !== 'string') {
        errors.set(fact.key, `${fact.label} must be text`);
        continue;
      }
      const value = normalizeFactInput(fact, raw ?? '');
      const message = validateFactInput(fact, value);
      if (message) {
        errors.set(fact.key, message);
        continue;
      }
      factByField.set(fact.edit.field, fact);
      // null, not undefined: undefined means "leave alone" to every owner DTO.
      payload[fact.edit.field] =
        value === '' ? null : fact.edit.input === 'number' ? Number(value) : value;
    }
    if (errors.size > 0) throw badRequest(errors);

    if (target === 'property') {
      const dto = await this.toDto(UpdateCustomerPropertyDto, payload, factByField);
      await this.propertyService.update(project.propertyId, dto, userId);
    } else {
      const dto = await this.toDto(UpdateCustomerDto, payload, factByField);
      await this.customerService.update(project.property.customerId, dto, userId);
    }
  }

  /** The owner's DTO, validated the way the global ValidationPipe would; its messages name the fact. */
  private async toDto<T extends object>(
    cls: ClassConstructor<T>,
    payload: Record<string, unknown>,
    factByField: Map<string, EditableFact>,
  ): Promise<T> {
    const dto = plainToInstance(cls, payload, { enableImplicitConversion: true });
    const failures = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
    if (failures.length === 0) return dto;

    const errors = new Map<string, string>();
    for (const failure of failures) {
      const fact = factByField.get(failure.property);
      const first = Object.values(failure.constraints ?? {})[0] ?? 'is not valid';
      const message = fact
        ? first.replace(new RegExp(`^${failure.property}\\b`), fact.label)
        : `${failure.property}: ${first}`;
      errors.set(fact?.key ?? failure.property, message);
    }
    throw badRequest(errors);
  }
}
