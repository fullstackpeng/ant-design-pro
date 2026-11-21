import * as platform from '@/services/backend/platform';
import * as tasks from '@/services/backend/scheduledTasks';

export type Task = BackendAPI.ScheduledTaskDto;
export type TaskRun = BackendAPI.TaskRunDto;
const options = { skipErrorHandler: true };
export const listTasks = (params: {
  current?: number;
  pageSize?: number;
  name?: string;
  type?: string;
}) =>
  tasks.listScheduledTasks(
    { ...params, type: params.type as 'internal' | undefined },
    options,
  );
export const createTask = (body: BackendAPI.CreateTaskDto) =>
  tasks.createScheduledTask(body, options);
export const updateTask = (id: string, body: BackendAPI.UpdateTaskDto) =>
  tasks.updateScheduledTask({ id }, body, options);
export const setEnabled = (task: Task) =>
  tasks.setScheduledTaskEnabled(
    { id: task.id },
    { revision: task.revision, enabled: !task.enabled },
    options,
  );
export const removeTask = (task: Task) =>
  tasks.deleteScheduledTask(
    { id: task.id },
    { revision: task.revision },
    options,
  );
export const triggerTask = (task: Task) =>
  tasks.triggerScheduledTask(
    { id: task.id },
    { revision: task.revision },
    options,
  );
export const listHandlers = () => tasks.listTaskHandlers(options);
export const listRuns = (params: {
  current?: number;
  pageSize?: number;
  taskName?: string;
  type?: string;
  status?: string;
  taskId?: string;
}) =>
  tasks.listTaskRuns(
    {
      current: params.current,
      pageSize: params.pageSize,
      name: params.taskName,
      type: params.type as 'internal' | undefined,
      status: params.status as BackendAPI.listTaskRunsParams['status'],
      taskId: params.taskId,
    },
    options,
  );
export const getRun = (id: string) => tasks.getTaskRun({ id }, options);
export const rerun = (id: string) => tasks.rerunTask({ id }, options);
export async function tenantOptions(keyword?: string) {
  const result = await platform.listTenants(
    { current: 1, pageSize: 100, name: keyword || undefined },
    options,
  );
  return result.data.map((tenant) => ({
    label: `${tenant.name} (${tenant.code})`,
    value: tenant.id,
  }));
}
