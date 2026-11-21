// @ts-ignore
/* eslint-disable */
import { request, type RequestOptions } from "@umijs/max";

/** 平台任务分页查询 GET /api/platform/scheduled-tasks */
export async function listScheduledTasks(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listScheduledTasksParams,
  options?: RequestOptions
) {
  return request<BackendAPI.TaskListResponseDto>(
    "/api/platform/scheduled-tasks",
    {
      method: "GET",
      params: {
        // current has a default value: 1
        current: "1",
        // pageSize has a default value: 20
        pageSize: "20",

        ...params,
      },
      ...(options || {}),
    }
  );
}

/** 创建平台任务 POST /api/platform/scheduled-tasks */
export async function createScheduledTask(
  body: BackendAPI.CreateTaskDto,
  options?: RequestOptions
) {
  return request<BackendAPI.TaskResponseDto>("/api/platform/scheduled-tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 逻辑删除任务，保留历史执行 DELETE /api/platform/scheduled-tasks/${param0} */
export async function deleteScheduledTask(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.deleteScheduledTaskParams,
  body: BackendAPI.RevisionDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/scheduled-tasks/${param0}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      params: { ...queryParams },
      data: body,
      ...(options || {}),
    }
  );
}

/** 修改平台任务配置 PATCH /api/platform/scheduled-tasks/${param0} */
export async function updateScheduledTask(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.updateScheduledTaskParams,
  body: BackendAPI.UpdateTaskDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.TaskResponseDto>(
    `/api/platform/scheduled-tasks/${param0}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      params: { ...queryParams },
      data: body,
      ...(options || {}),
    }
  );
}

/** 启用或禁用平台任务 PATCH /api/platform/scheduled-tasks/${param0}/enabled */
export async function setScheduledTaskEnabled(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.setScheduledTaskEnabledParams,
  body: BackendAPI.TaskEnabledDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.EmptyResponseDto>(
    `/api/platform/scheduled-tasks/${param0}/enabled`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      params: { ...queryParams },
      data: body,
      ...(options || {}),
    }
  );
}

/** 手动触发已启用任务 POST /api/platform/scheduled-tasks/${param0}/trigger */
export async function triggerScheduledTask(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.triggerScheduledTaskParams,
  body: BackendAPI.RevisionDto,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.DispatchResponseDto>(
    `/api/platform/scheduled-tasks/${param0}/trigger`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      params: { ...queryParams },
      data: body,
      ...(options || {}),
    }
  );
}

/** 预注册内部任务处理器 GET /api/platform/scheduled-tasks/handlers */
export async function listTaskHandlers(options?: RequestOptions) {
  return request<BackendAPI.HandlerListResponseDto>(
    "/api/platform/scheduled-tasks/handlers",
    {
      method: "GET",
      ...(options || {}),
    }
  );
}

/** 查询历史执行及尝试记录 GET /api/platform/scheduled-tasks/runs */
export async function listTaskRuns(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.listTaskRunsParams,
  options?: RequestOptions
) {
  return request<BackendAPI.RunListResponseDto>(
    "/api/platform/scheduled-tasks/runs",
    {
      method: "GET",
      params: {
        // current has a default value: 1
        current: "1",
        // pageSize has a default value: 20
        pageSize: "20",

        ...params,
      },
      ...(options || {}),
    }
  );
}

/** 执行详情与配置快照 GET /api/platform/scheduled-tasks/runs/${param0} */
export async function getTaskRun(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.getTaskRunParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.RunResponseDto>(
    `/api/platform/scheduled-tasks/runs/${param0}`,
    {
      method: "GET",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 按当前配置重跑失败记录，保留幂等键及来源 POST /api/platform/scheduled-tasks/runs/${param0}/rerun */
export async function rerunTask(
  // 叠加生成的Param类型 (非body参数swagger默认没有生成对象)
  params: BackendAPI.rerunTaskParams,
  options?: RequestOptions
) {
  const { id: param0, ...queryParams } = params;
  return request<BackendAPI.DispatchResponseDto>(
    `/api/platform/scheduled-tasks/runs/${param0}/rerun`,
    {
      method: "POST",
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}
