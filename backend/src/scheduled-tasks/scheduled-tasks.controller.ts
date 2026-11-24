import {
  Body,
  Controller,
  Delete,
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
import { AuditEndpoint } from '../audit/audit-action.js';
import { RequireScope } from '../auth/access-scope.decorator.js';
import { CurrentSession } from '../auth/current-session.decorator.js';
import type { SessionContext } from '../auth/session-context.js';
import { IdParamDto } from '../common/dto/request.dto.js';
import { ApiErrors, EmptyResponseDto } from '../common/dto/response.dto.js';
import {
  CreateTaskDto,
  RevisionDto,
  RunIdDto,
  RunQueryDto,
  TaskEnabledDto,
  TaskQueryDto,
  UpdateTaskDto,
} from './dto/task-request.dto.js';
import {
  DispatchResponseDto,
  HandlerListResponseDto,
  RunListResponseDto,
  RunResponseDto,
  TaskListResponseDto,
  TaskResponseDto,
} from './dto/task-response.dto.js';
import { ScheduledTasksService } from './scheduled-tasks.service.js';

@Controller('api/platform/scheduled-tasks')
@RequireScope('platform')
@ApiTags('scheduledTasks')
@ApiCookieAuth('session')
@ApiErrors()
@ApiExtraModels(IdParamDto, RunIdDto, TaskQueryDto, RunQueryDto)
export class ScheduledTasksController {
  constructor(
    @Inject(ScheduledTasksService)
    private readonly tasks: ScheduledTasksService,
  ) {}

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listScheduledTasks',
    summary: '平台任务分页查询',
  })
  @ApiOkResponse({ type: TaskListResponseDto })
  list(@Query() query: TaskQueryDto) {
    return this.tasks.list(query);
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('handlers')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listTaskHandlers',
    summary: '预注册内部任务处理器',
  })
  @ApiOkResponse({ type: HandlerListResponseDto })
  handlers() {
    return this.tasks.handlers();
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('runs')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    operationId: 'listTaskRuns',
    summary: '查询历史执行及尝试记录',
  })
  @ApiOkResponse({ type: RunListResponseDto })
  runs(@Query() query: RunQueryDto) {
    return this.tasks.runs(query);
  }

  @AuditEndpoint({ exempt: '普通查询或状态轮询，无业务变更' })
  @Get('runs/:id')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ operationId: 'getTaskRun', summary: '执行详情与配置快照' })
  @ApiOkResponse({ type: RunResponseDto })
  run(@Param() params: RunIdDto) {
    return this.tasks.run(params.id);
  }

  @AuditEndpoint({ event: 'tasks.rerun', name: '重跑任务' })
  @Post('runs/:id/rerun')
  @ApiOperation({
    operationId: 'rerunTask',
    summary: '按当前配置重跑失败记录，保留幂等键及来源',
  })
  @ApiCreatedResponse({ type: DispatchResponseDto })
  rerun(@CurrentSession() actor: SessionContext, @Param() params: RunIdDto) {
    return this.tasks.rerun(actor, params.id);
  }

  @AuditEndpoint({ event: 'tasks.create', name: '创建定时任务' })
  @Post()
  @ApiBody({ type: CreateTaskDto })
  @ApiOperation({ operationId: 'createScheduledTask', summary: '创建平台任务' })
  @ApiCreatedResponse({ type: TaskResponseDto })
  create(@CurrentSession() actor: SessionContext, @Body() body: CreateTaskDto) {
    return this.tasks.create(actor, body);
  }

  @AuditEndpoint({ event: 'tasks.update', name: '修改定时任务' })
  @Patch(':id')
  @ApiBody({ type: UpdateTaskDto })
  @ApiOperation({
    operationId: 'updateScheduledTask',
    summary: '修改平台任务配置',
  })
  @ApiOkResponse({ type: TaskResponseDto })
  update(
    @CurrentSession() actor: SessionContext,
    @Param() params: IdParamDto,
    @Body() body: UpdateTaskDto,
  ) {
    return this.tasks.update(actor, BigInt(params.id), body);
  }

  @AuditEndpoint({ event: 'tasks.enable', name: '修改任务启用状态' })
  @Patch(':id/enabled')
  @ApiBody({ type: TaskEnabledDto })
  @ApiOperation({
    operationId: 'setScheduledTaskEnabled',
    summary: '启用或禁用平台任务',
  })
  @ApiOkResponse({ type: EmptyResponseDto })
  enable(
    @CurrentSession() actor: SessionContext,
    @Param() params: IdParamDto,
    @Body() body: TaskEnabledDto,
  ) {
    return this.tasks.enable(actor, BigInt(params.id), body);
  }

  @AuditEndpoint({ event: 'tasks.delete', name: '删除定时任务' })
  @Delete(':id')
  @ApiBody({ type: RevisionDto })
  @ApiOperation({
    operationId: 'deleteScheduledTask',
    summary: '逻辑删除任务，保留历史执行',
  })
  @ApiOkResponse({ type: EmptyResponseDto })
  remove(
    @CurrentSession() actor: SessionContext,
    @Param() params: IdParamDto,
    @Body() body: RevisionDto,
  ) {
    return this.tasks.remove(actor, BigInt(params.id), body);
  }

  @AuditEndpoint({ event: 'tasks.trigger', name: '手动触发任务' })
  @Post(':id/trigger')
  @ApiBody({ type: RevisionDto })
  @ApiOperation({
    operationId: 'triggerScheduledTask',
    summary: '手动触发已启用任务',
  })
  @ApiCreatedResponse({ type: DispatchResponseDto })
  trigger(
    @CurrentSession() actor: SessionContext,
    @Param() params: IdParamDto,
    @Body() body: RevisionDto,
  ) {
    return this.tasks.trigger(actor, BigInt(params.id), body);
  }
}
