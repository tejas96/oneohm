import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '../users/users.module';
import { EmployeeController } from './controllers/employee.controller';
import { EmployeeProfileEntity } from './entities/employee-profile.entity';
import { EmployeeProfileRepository } from './repositories/employee-profile.repository';
import { EmployeeService } from './services/employee.service';

/**
 * Employees Module
 * Manages employee profile entities and operations
 */
@Module({
  imports: [TypeOrmModule.forFeature([EmployeeProfileEntity]), forwardRef(() => UsersModule)],
  controllers: [EmployeeController],
  providers: [EmployeeService, EmployeeProfileRepository],
  exports: [EmployeeService, EmployeeProfileRepository],
})
export class EmployeesModule {}
