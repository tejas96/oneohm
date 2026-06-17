import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NPSCategory } from '@tejas96/shared/types';

import { CurrentUser } from '../../auth/decorators';
import { JwtAuthGuard } from '../../auth/guards';
import {
  CreateCustomerFeedbackDto,
  CustomerFeedbackResponseDto,
  UpdateCustomerFeedbackDto,
} from '../dto';
import { CustomerFeedbackService } from '../services';

/**
 * Controller for Customer Feedback
 */
@ApiTags('Customer Feedback')
@Controller('customer-feedback')
@UseGuards(JwtAuthGuard)
export class CustomerFeedbackController {
  constructor(private readonly feedbackService: CustomerFeedbackService) {}

  // ============================================
  // CREATE
  // ============================================

  @Post()
  @ApiOperation({ summary: 'Create customer feedback' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Feedback created successfully',
    type: CustomerFeedbackResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input',
  })
  async create(
    @Body() createDto: CreateCustomerFeedbackDto,
    @CurrentUser() user: { id: string },
  ): Promise<CustomerFeedbackResponseDto> {
    return this.feedbackService.create({
      ...createDto,
      createdBy: user.id,
    });
  }

  // ============================================
  // READ
  // ============================================

  @Get()
  @ApiOperation({ summary: 'Get all customer feedback' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of all feedback',
    type: [CustomerFeedbackResponseDto],
  })
  async findAll(): Promise<CustomerFeedbackResponseDto[]> {
    return this.feedbackService.findAll();
  }

  @Get('published')
  @ApiOperation({ summary: 'Get all published feedback (testimonials)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of published feedback',
    type: [CustomerFeedbackResponseDto],
  })
  async findPublished(): Promise<CustomerFeedbackResponseDto[]> {
    return this.feedbackService.findPublished();
  }

  @Get('without-response')
  @ApiOperation({ summary: 'Get feedback without company response' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of feedback without response',
    type: [CustomerFeedbackResponseDto],
  })
  async findWithoutResponse(): Promise<CustomerFeedbackResponseDto[]> {
    return this.feedbackService.findWithoutResponse();
  }

  @Get('with-response')
  @ApiOperation({ summary: 'Get feedback with company response' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of feedback with response',
    type: [CustomerFeedbackResponseDto],
  })
  async findWithResponse(): Promise<CustomerFeedbackResponseDto[]> {
    return this.feedbackService.findWithResponse();
  }

  @Get('organization/:organizationId')
  @ApiOperation({ summary: 'Get feedback by organization' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of feedback for organization',
    type: [CustomerFeedbackResponseDto],
  })
  async findByOrganization(
    @Param('organizationId') organizationId: string,
  ): Promise<CustomerFeedbackResponseDto[]> {
    return this.feedbackService.findByOrganization(organizationId);
  }

  @Get('organization/:organizationId/published')
  @ApiOperation({ summary: 'Get published feedback by organization' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of published feedback for organization',
    type: [CustomerFeedbackResponseDto],
  })
  async findPublishedByOrganization(
    @Param('organizationId') organizationId: string,
  ): Promise<CustomerFeedbackResponseDto[]> {
    return this.feedbackService.findPublishedByOrganization(organizationId);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'Get feedback by project' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of feedback for project',
    type: [CustomerFeedbackResponseDto],
  })
  async findByProject(
    @Param('projectId') projectId: string,
  ): Promise<CustomerFeedbackResponseDto[]> {
    return this.feedbackService.findByProject(projectId);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Get feedback by customer' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of feedback for customer',
    type: [CustomerFeedbackResponseDto],
  })
  async findByCustomer(
    @Param('customerId') customerId: string,
  ): Promise<CustomerFeedbackResponseDto[]> {
    return this.feedbackService.findByCustomer(customerId);
  }

  @Get('nps-category/:category')
  @ApiOperation({ summary: 'Get feedback by NPS category' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of feedback by NPS category',
    type: [CustomerFeedbackResponseDto],
  })
  async findByNPSCategory(
    @Param('category') category: NPSCategory,
  ): Promise<CustomerFeedbackResponseDto[]> {
    return this.feedbackService.findByNPSCategory(category);
  }

  @Get('date-range')
  @ApiOperation({ summary: 'Get feedback by date range' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of feedback within date range',
    type: [CustomerFeedbackResponseDto],
  })
  async findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<CustomerFeedbackResponseDto[]> {
    return this.feedbackService.findByDateRange(new Date(startDate), new Date(endDate));
  }

  // ============================================
  // NPS & STATISTICS
  // ============================================

  @Get('organization/:organizationId/nps-score')
  @ApiOperation({ summary: 'Calculate NPS score for organization' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'NPS score calculation',
  })
  async calculateNPSScore(@Param('organizationId') organizationId: string): Promise<{
    npsScore: number;
    totalResponses: number;
    promoters: number;
    passives: number;
    detractors: number;
    promoterPercentage: number;
    passivePercentage: number;
    detractorPercentage: number;
  }> {
    return this.feedbackService.calculateNPSScore(organizationId);
  }

  @Get('organization/:organizationId/average-rating')
  @ApiOperation({ summary: 'Get average rating for organization' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Average rating',
  })
  async getAverageRating(
    @Param('organizationId') organizationId: string,
  ): Promise<{ averageRating: number }> {
    const rating = await this.feedbackService.getAverageRating(organizationId);
    return { averageRating: rating };
  }

  @Get('organization/:organizationId/department-averages')
  @ApiOperation({ summary: 'Get department-wise average ratings' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department averages',
  })
  async getDepartmentAverages(
    @Param('organizationId') organizationId: string,
  ): Promise<Record<string, number>> {
    return this.feedbackService.getDepartmentAverages(organizationId);
  }

  @Get('organization/:organizationId/statistics')
  @ApiOperation({ summary: 'Get comprehensive statistics for organization' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comprehensive feedback statistics',
  })
  async getStatistics(
    @Param('organizationId') organizationId: string,
  ): Promise<Record<string, unknown>> {
    return this.feedbackService.getStatistics(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get feedback by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feedback details',
    type: CustomerFeedbackResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Feedback not found',
  })
  async findById(@Param('id') id: string): Promise<CustomerFeedbackResponseDto> {
    return this.feedbackService.findById(id);
  }

  // ============================================
  // UPDATE
  // ============================================

  @Patch(':id')
  @ApiOperation({ summary: 'Update feedback' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feedback updated successfully',
    type: CustomerFeedbackResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Feedback not found',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomerFeedbackDto,
    @CurrentUser() user: { id: string },
  ): Promise<CustomerFeedbackResponseDto> {
    return this.feedbackService.update(id, {
      ...updateDto,
      updatedBy: user.id,
    } as UpdateCustomerFeedbackDto);
  }

  @Patch(':id/respond')
  @ApiOperation({ summary: 'Add company response to feedback' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Response added successfully',
    type: CustomerFeedbackResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Feedback not found',
  })
  async addCompanyResponse(
    @Param('id') id: string,
    @Body('response') response: string,
    @CurrentUser() user: { id: string },
  ): Promise<CustomerFeedbackResponseDto> {
    return this.feedbackService.addCompanyResponse(id, response, user.id);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish feedback as testimonial' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feedback published successfully',
    type: CustomerFeedbackResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Feedback not found',
  })
  async publishFeedback(@Param('id') id: string): Promise<CustomerFeedbackResponseDto> {
    return this.feedbackService.publishFeedback(id);
  }

  @Patch(':id/unpublish')
  @ApiOperation({ summary: 'Unpublish feedback' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Feedback unpublished successfully',
    type: CustomerFeedbackResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Feedback not found',
  })
  async unpublishFeedback(@Param('id') id: string): Promise<CustomerFeedbackResponseDto> {
    return this.feedbackService.unpublishFeedback(id);
  }

  // ============================================
  // DELETE
  // ============================================

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete feedback (soft delete)' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Feedback deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Feedback not found',
  })
  async delete(@Param('id') id: string): Promise<void> {
    return this.feedbackService.delete(id);
  }
}
