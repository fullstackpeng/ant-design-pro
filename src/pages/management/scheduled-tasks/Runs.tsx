import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Descriptions, Drawer, Popconfirm, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import { useManagement } from '../useManagement';
import { getRun, listRuns, rerun, type TaskRun } from './service';

export default function Runs({ taskId }: { taskId?: string }) {
  const { t, run, load, report, pending } = useManagement();
  const action = useRef<ActionType | null>(null);
  const [detail, setDetail] = useState<TaskRun>();
  const states = {
    queued: t('taskQueued', '等待执行'),
    running: t('taskRunning', '执行中'),
    retrying: t('taskRetrying', '等待重试'),
    succeeded: t('taskSucceeded', '成功'),
    failed: t('taskFailed', '失败'),
    timed_out: t('taskTimedOut', '超时'),
    skipped: t('taskSkipped', '已跳过'),
  };
  const columns: ProColumns<TaskRun>[] = [
    { title: t('taskName', '任务名称'), dataIndex: 'taskName' },
    {
      title: t('taskType', '任务类型'),
      dataIndex: 'type',
      valueEnum: { internal: t('taskInternal', '内部任务') },
    },
    {
      title: t('taskTarget', '租户 / 全局'),
      dataIndex: 'tenantId',
      search: false,
      render: (_, row) => row.tenantId ?? t('taskGlobal', '全局'),
    },
    {
      title: t('status', '状态'),
      dataIndex: 'status',
      valueEnum: states,
      render: (_, row) => (
        <Tag
          color={
            row.status === 'succeeded'
              ? 'green'
              : ['failed', 'timed_out'].includes(row.status)
                ? 'red'
                : 'default'
          }
        >
          {states[row.status]}
        </Tag>
      ),
    },
    {
      title: t('taskAttempts', '尝试次数'),
      dataIndex: 'attemptsMade',
      search: false,
    },
    {
      title: t('createdAt', '创建时间'),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      search: false,
    },
    {
      title: t('taskDuration', '耗时 (ms)'),
      dataIndex: 'durationMs',
      search: false,
    },
    {
      title: t('taskError', '错误信息'),
      dataIndex: 'error',
      search: false,
      ellipsis: true,
    },
    {
      title: t('actions', '操作'),
      valueType: 'option',
      render: (_, row) => [
        <Button
          key="detail"
          type="link"
          onClick={async () => {
            try {
              setDetail((await getRun(row.id)).data);
            } catch (error) {
              report(error);
            }
          }}
        >
          {t('details', '详情')}
        </Button>,
        ...(['failed', 'timed_out'].includes(row.status)
          ? [
              <Popconfirm
                key="rerun"
                title={t(
                  'taskRerunConfirm',
                  '按当前配置重跑此目标，并保留原幂等键？',
                )}
                onConfirm={() =>
                  run(
                    () => rerun(row.id),
                    () => action.current?.reload(),
                  )
                }
              >
                <Button type="link" disabled={pending}>
                  {t('taskRerun', '重新执行')}
                </Button>
              </Popconfirm>,
            ]
          : []),
      ],
    },
  ];
  return (
    <>
      <ProTable<TaskRun>
        rowKey="id"
        actionRef={action}
        columns={columns}
        params={{ taskId }}
        polling={5000}
        request={(params) => load(() => listRuns(params))}
        scroll={{ x: 1000 }}
      />
      <Drawer
        open={Boolean(detail)}
        onClose={() => setDetail(undefined)}
        title={t('taskRunDetail', '执行详情')}
        size="large"
      >
        {detail && (
          <>
            <Descriptions
              column={1}
              items={[
                {
                  key: 'id',
                  label: t('taskRunId', '执行编号'),
                  children: detail.id,
                },
                {
                  key: 'status',
                  label: t('status', '状态'),
                  children: states[detail.status],
                },
                {
                  key: 'source',
                  label: t('taskSource', '触发来源'),
                  children: detail.source,
                },
                {
                  key: 'parent',
                  label: t('taskRetryOf', '重跑来源'),
                  children: detail.retryOf ?? '—',
                },
                {
                  key: 'start',
                  label: t('taskStarted', '开始时间'),
                  children: detail.startedAt ?? '—',
                },
                {
                  key: 'end',
                  label: t('taskFinished', '结束时间'),
                  children: detail.finishedAt ?? '—',
                },
                {
                  key: 'key',
                  label: t('taskIdempotency', '幂等键'),
                  children: detail.idempotencyKey,
                },
                {
                  key: 'error',
                  label: t('taskError', '错误信息'),
                  children: detail.error || '—',
                },
              ]}
            />
            <h3>{t('taskSnapshot', '执行配置快照')}</h3>
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(detail.snapshot, null, 2)}
            </pre>
            <h3>{t('taskResult', '执行结果')}</h3>
            <pre className="whitespace-pre-wrap break-all">
              {JSON.stringify(detail.result, null, 2)}
            </pre>
            <ProTable<BackendAPI.TaskAttemptDto>
              rowKey="id"
              search={false}
              options={false}
              pagination={false}
              dataSource={detail.attempts}
              columns={[
                { title: t('taskAttempt', '尝试'), dataIndex: 'number' },
                { title: t('status', '状态'), dataIndex: 'status' },
                {
                  title: t('taskStarted', '开始时间'),
                  dataIndex: 'startedAt',
                  valueType: 'dateTime',
                },
                {
                  title: t('taskDuration', '耗时 (ms)'),
                  dataIndex: 'durationMs',
                },
                { title: t('taskError', '错误信息'), dataIndex: 'error' },
              ]}
            />
          </>
        )}
      </Drawer>
    </>
  );
}
