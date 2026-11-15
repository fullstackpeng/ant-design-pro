import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiProperty,
  ApiPropertyOptional,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export class SuccessDto {
  @ApiProperty({ enum: [true], type: Boolean })
  success!: true;
}

export class ErrorResponseDto {
  @ApiProperty({ enum: [false], type: Boolean })
  success!: false;

  @ApiProperty()
  errorMessage!: string;

  @ApiPropertyOptional({ type: [String], description: '请求参数校验失败详情' })
  errors?: string[];

  @ApiPropertyOptional()
  errorCode?: number;
}

export class EmptyResponseDto extends SuccessDto {
  @ApiProperty({
    type: 'object',
    properties: {},
    nullable: true,
    enum: [null],
    example: null,
  })
  data!: null;
}

export const ApiErrors = () =>
  applyDecorators(
    ApiBadRequestResponse({
      type: ErrorResponseDto,
      description: '参数格式或取值错误',
    }),
    ApiUnauthorizedResponse({
      type: ErrorResponseDto,
      description: '凭据无效或会话失效',
    }),
    ApiForbiddenResponse({
      type: ErrorResponseDto,
      description: '权限不足、租户不匹配或套餐不可用',
    }),
    ApiNotFoundResponse({ type: ErrorResponseDto, description: '记录不存在' }),
    ApiConflictResponse({
      type: ErrorResponseDto,
      description: '记录冲突、额度不足或业务规则冲突',
    }),
  );
