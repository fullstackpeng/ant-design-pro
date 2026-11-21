import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormDependency,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProTable,
} from '@ant-design/pro-components';
import { Alert, Button, Drawer, Popconfirm, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import { useManagement } from '../useManagement';
import Runs from './Runs';
import {
  createTask,
  listHandlers,
  listTasks,
  removeTask,
  setEnabled,
  type Task,
  tenantOptions,
  triggerTask,
  updateTask,
} from './service';

type FormValues = Omit<BackendAPI.CreateTaskDto, 'params'> & {
  paramsText: string;
};

export default function ScheduledTasks() {
  const { t, run, load, pending } = useManagement();
  const action = useRef<ActionType | null>(null);
  const [editing, setEditing] = useState<Task | null>();
  const [logs, setLogs] = useState<Task | null>();
  const refresh = () => {
    action.current?.reload();
  };
  const scopes = {
    global: t('taskGlobal', '全局'),
    selected: t('taskSelected', '指定租户'),
    all: t('taskAll', '全部启用租户'),
  };
  const columns: ProColumns<Task>[] = [
    { title: t('taskName', '任务名称'), dataIndex: 'name' },
    {
      title: t('taskType', '任务类型'),
      dataIndex: 'type',
      valueEnum: { internal: t('taskInternal', '内部任务') },
    },
    { title: t('taskHandler', '处理器'), dataIndex: 'handler', search: false },
    { title: 'Cron', dataIndex: 'cron', search: false },
    { title: t('taskTimezone', '时区'), dataIndex: 'timezone', search: false },
    {
      title: t('taskScope', '作用范围'),
      dataIndex: 'scope',
      valueEnum: scopes,
      search: false,
    },
    {
      title: t('status', '状态'),
      search: false,
      render: (_, row) => (
        <Tag color={row.enabled ? 'green' : 'default'}>
          {row.enabled ? t('enabled', '启用') : t('disabled', '停用')}
        </Tag>
      ),
    },
    {
      title: t('taskSync', '调度状态'),
      search: false,
      render: (_, row) =>
        row.syncError ? (
          <Tag color="red">{row.syncError}</Tag>
        ) : (
          <Tag color={row.syncedRevision === row.revision ? 'green' : 'orange'}>
            {row.syncedRevision === row.revision
              ? t('taskSynced', '已同步')
              : t('taskSyncPending', '等待 Worker 同步')}
          </Tag>
        ),
    },
    {
      title: t('actions', '操作'),
      valueType: 'option',
      render: (_, row) => [
        <Button key="edit" type="link" onClick={() => setEditing(row)}>
          {t('edit', '编辑')}
        </Button>,
        <Popconfirm
          key="enable"
          title={
            row.enabled
              ? t(
                  'taskDisableConfirm',
                  '停止后续调度并跳过未开始的执行？正在运行的任务会继续完成。',
                )
              : t('taskEnableConfirm', '启用此任务？')
          }
          onConfirm={() => run(() => setEnabled(row), refresh)}
        >
          <Button type="link" disabled={pending}>
            {row.enabled ? t('disable', '停用') : t('enable', '启用')}
          </Button>
        </Popconfirm>,
        <Popconfirm
          key="trigger"
          title={t(
            'taskTriggerConfirm',
            '立即创建一次执行？全部租户将分别执行。',
          )}
          disabled={!row.enabled}
          onConfirm={() => run(() => triggerTask(row), refresh)}
        >
          <Button type="link" disabled={!row.enabled || pending}>
            {t('taskTrigger', '立即执行')}
          </Button>
        </Popconfirm>,
        <Button key="logs" type="link" onClick={() => setLogs(row)}>
          {t('taskLogs', '执行记录')}
        </Button>,
        <Popconfirm
          key="delete"
          title={t(
            'taskDeleteConfirm',
            '删除任务并停止后续执行？历史记录将保留。',
          )}
          onConfirm={() => run(() => removeTask(row), refresh)}
        >
          <Button type="link" danger disabled={pending}>
            {t('delete', '删除')}
          </Button>
        </Popconfirm>,
      ],
    },
  ];
  return (
    <PageContainer
      title={t('scheduledTasks', '定时任务')}
      content={t(
        'taskHelp',
        '平台统一管理。全部租户独立执行和重试，同一任务在同一租户内串行。配置与队列由 Worker 自动同步。',
      )}
    >
      <ProTable<Task>
        rowKey="id"
        actionRef={action}
        columns={columns}
        polling={5000}
        request={(params) => load(() => listTasks(params))}
        scroll={{ x: 1200 }}
        toolBarRender={() => [
          <Button key="logs" onClick={() => setLogs(null)}>
            {t('taskAllLogs', '全部执行记录')}
          </Button>,
          <Button key="new" type="primary" onClick={() => setEditing(null)}>
            {t('taskCreate', '新增任务')}
          </Button>,
        ]}
      />
      {editing !== undefined && (
        <ModalForm<FormValues>
          name="scheduled-task-config"
          title={
            editing ? t('taskEdit', '编辑任务') : t('taskCreate', '新增任务')
          }
          open
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
          initialValues={
            editing
              ? {
                  ...editing,
                  paramsText: JSON.stringify(editing.params, null, 2),
                }
              : {
                  type: 'internal',
                  handler: 'system.ping',
                  cron: '0 * * * *',
                  timezone: 'Asia/Taipei',
                  scope: 'global',
                  tenantIds: [],
                  paramsText: '{}',
                  enabled: false,
                  timeoutMs: 30000,
                  maxAttempts: 3,
                  concurrency: 1,
                }
          }
          onFinish={(values) => {
            const { paramsText, ...fields } = values;
            const body = {
              ...fields,
              tenantIds: fields.scope === 'selected' ? fields.tenantIds : [],
              params: JSON.parse(paramsText),
            };
            return run(
              () =>
                editing
                  ? updateTask(editing.id, {
                      ...body,
                      revision: editing.revision,
                    })
                  : createTask(body),
              () => {
                setEditing(undefined);
                refresh();
              },
            );
          }}
        >
          <Alert
            type="info"
            showIcon
            title={t(
              'taskConfigHelp',
              '修改仅影响后续触发；已经创建的执行保留配置快照。重跑按当前配置执行，并沿用原幂等键。',
            )}
            className="mb-4"
          />
          <ProFormText
            name="name"
            label={t('taskName', '任务名称')}
            rules={[{ required: true }, { max: 100 }]}
          />
          <ProFormSelect
            name="type"
            label={t('taskType', '任务类型')}
            options={[
              { label: t('taskInternal', '内部任务'), value: 'internal' },
            ]}
            rules={[{ required: true }]}
          />
          <ProFormSelect
            name="handler"
            label={t('taskHandler', '处理器')}
            request={async () =>
              (await listHandlers()).data.map((item) => ({
                label: item.name,
                value: item.code,
              }))
            }
            rules={[{ required: true }]}
          />
          <ProFormText
            name="cron"
            label="Cron"
            tooltip={t(
              'taskCronHelp',
              '支持5或6字段；例如 0 * * * * 表示每小时，时区单独指定。',
            )}
            rules={[{ required: true }, { max: 100 }]}
          />
          <ProFormText
            name="timezone"
            label={t('taskTimezone', '时区')}
            rules={[{ required: true }, { max: 64 }]}
          />
          <ProFormSelect
            name="scope"
            label={t('taskScope', '作用范围')}
            valueEnum={scopes}
            rules={[{ required: true }]}
          />
          <ProFormDependency name={['scope']}>
            {({ scope }) =>
              scope === 'selected' ? (
                <ProFormSelect
                  name="tenantIds"
                  label={t('taskTenants', '目标租户')}
                  mode="multiple"
                  showSearch
                  debounceTime={300}
                  request={({ keyWords }) => tenantOptions(keyWords)}
                  rules={[{ required: true }, { type: 'array', max: 100 }]}
                />
              ) : null
            }
          </ProFormDependency>
          <ProFormTextArea
            name="paramsText"
            label={t('taskParams', '参数 JSON')}
            tooltip={t(
              'taskParamsHelp',
              '系统检查支持 message、delayMs；租户字典统计使用 {}。',
            )}
            fieldProps={{ rows: 4 }}
            rules={[
              { required: true },
              {
                validator: async (_: unknown, value: string) => {
                  try {
                    const parsed = JSON.parse(value);
                    if (
                      !parsed ||
                      Array.isArray(parsed) ||
                      typeof parsed !== 'object'
                    )
                      throw new Error();
                  } catch {
                    throw new Error(
                      t('taskJsonInvalid', '请输入有效的 JSON 对象'),
                    );
                  }
                },
              },
            ]}
          />
          <ProFormDigit
            name="timeoutMs"
            label={t('taskTimeout', '超时 (ms)')}
            min={100}
            max={300000}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true }]}
          />
          <ProFormDigit
            name="maxAttempts"
            label={t('taskMaxAttempts', '最多执行次数（包含首次）')}
            min={1}
            max={5}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true }]}
          />
          <ProFormDigit
            name="concurrency"
            label={t('taskConcurrency', '任务总并发上限')}
            min={1}
            max={10}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true }]}
          />
          <ProFormSwitch name="enabled" label={t('enabled', '启用')} />
        </ModalForm>
      )}
      <Drawer
        open={logs !== undefined}
        onClose={() => setLogs(undefined)}
        title={
          logs
            ? `${logs.name} · ${t('taskLogs', '执行记录')}`
            : t('taskAllLogs', '全部执行记录')
        }
        size="large"
        styles={{ wrapper: { width: 'min(1200px, 95vw)' } }}
        destroyOnHidden
      >
        {logs !== undefined && <Runs taskId={logs?.id} />}
      </Drawer>
    </PageContainer>
  );
}
