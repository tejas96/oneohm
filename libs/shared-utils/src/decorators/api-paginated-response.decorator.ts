import { applyDecorators, type Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * ApiPaginatedResponse
 * 
 * Swagger decorator for paginated responses.
 * Automatically generates correct schema for PaginatedResponse<T>
 * 
 * @example
 * @ApiPaginatedResponse(UserResponseDto)
 * @Get()
 * async findAll() {
 *   // Returns PaginatedResponse<UserResponseDto>
 * }
 */
export const ApiPaginatedResponse = <TModel extends Type<unknown>>(
  model: TModel,
  description?: string,
): ReturnType<typeof applyDecorators> => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: description || `Paginated list of ${model.name}`,
      schema: {
        allOf: [
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
              meta: {
                type: 'object',
                properties: {
                  page: {
                    type: 'number',
                    example: 1,
                  },
                  limit: {
                    type: 'number',
                    example: 20,
                  },
                  total: {
                    type: 'number',
                    example: 100,
                  },
                  totalPages: {
                    type: 'number',
                    example: 5,
                  },
                },
              },
            },
          },
        ],
      },
    }),
  );
};

