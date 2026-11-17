import {
  Body,
  Controller,
  Get,
  Header,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequireScope } from '../auth/access-scope.decorator.js';
import { IdParamDto } from '../common/dto/request.dto.js';
import { ApiErrors, EmptyResponseDto } from '../common/dto/response.dto.js';
import {
  CreateUserDto,
  ResetPasswordDto,
  UpdateUserDto,
  UserQueryDto,
} from './dto/user-request.dto.js';
import { UserListResponseDto } from './dto/user-response.dto.js';
import { UsersService } from './users.service.js';
@Controller('api/platform/users')
@RequireScope('platform')
@ApiTags('users')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto, UserQueryDto)
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listUsers',
    summary: '分页查询全局账号及租户成员关系',
  })
  @ApiOkResponse({ type: UserListResponseDto })
  list(@Query() query: UserQueryDto): Promise<UserListResponseDto> {
    return this.users.list(query);
  }
  @Post()
  @ApiOperation({ operationId: 'createUser', summary: '创建普通全局账号' })
  @ApiBody({ type: CreateUserDto })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  create(@Body() body: CreateUserDto): Promise<EmptyResponseDto> {
    return this.users.create(body);
  }
  @Patch(':id')
  @ApiOperation({
    operationId: 'updateUser',
    summary: '修改账号姓名及全局状态',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ type: EmptyResponseDto })
  update(
    @Param() params: IdParamDto,
    @Body() body: UpdateUserDto,
  ): Promise<EmptyResponseDto> {
    return this.users.update(params.id, body);
  }
  @Post(':id/password')
  @ApiOperation({
    operationId: 'resetUserPassword',
    summary: '重置密码并撤销全部会话',
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiCreatedResponse({ type: EmptyResponseDto })
  reset(
    @Param() params: IdParamDto,
    @Body() body: ResetPasswordDto,
  ): Promise<EmptyResponseDto> {
    return this.users.reset(params.id, body.password);
  }
}
