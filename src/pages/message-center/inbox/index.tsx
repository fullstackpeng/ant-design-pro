// biome-ignore-all lint/security/noDangerouslySetInnerHtml: notification HTML is sanitized server-side and again before rendering
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useQueryClient } from '@tanstack/react-query';
import { useIntl } from '@umijs/max';
import { App, Button, Modal, Segmented, Space, Tag } from 'antd';
import React, { useMemo, useRef, useState } from 'react';
import { sanitizeNotificationHtml } from '@/utils/sanitizeNotificationHtml';
import {
  type InboxNotification,
  type InboxStatus,
  listInbox,
  markAllRead,
  markRead,
} from './service';
import { useStyles } from './style';

export default function Inbox() {
  const intl = useIntl();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { styles } = useStyles();
  const action = useRef<ActionType | null>(null);
  const [status, setStatus] = useState<InboxStatus>('all');
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [active, setActive] = useState<InboxNotification | null>(null);
  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id: `messageCenter.${id}`, defaultMessage });
  const safeContent = useMemo(
    () => sanitizeNotificationHtml(active?.contentHtml),
    [active?.contentHtml],
  );

  async function openMessage(record: InboxNotification) {
    setActive(record);
    if (record.readAt) return;
    try {
      await markRead(record.id);
      setActive({ ...record, readAt: new Date().toISOString() });
      action.current?.reload();
      void queryClient.invalidateQueries({ queryKey: ['notification-inbox'] });
    } catch (error) {
      const detail = (
        error as { response?: { data?: { errorMessage?: string } } }
      ).response?.data?.errorMessage;
      message.error(detail ?? t('failed', '操作失败，请重试'));
    }
  }

  async function readAll() {
    try {
      await markAllRead();
      message.success(t('saved', '操作成功'));
      setActive(null);
      action.current?.reload();
      void queryClient.invalidateQueries({ queryKey: ['notification-inbox'] });
    } catch (error) {
      const detail = (
        error as { response?: { data?: { errorMessage?: string } } }
      ).response?.data?.errorMessage;
      message.error(detail ?? t('failed', '操作失败，请重试'));
    }
  }

  const columns: ProColumns<InboxNotification>[] = [
    {
      title: t('title', '标题'),
      dataIndex: 'title',
      ellipsis: true,
      render: (_, row) => (
        <Space size="small">
          <span>{row.title}</span>
          {!row.readAt && <Tag color="red">{t('unread', '未读')}</Tag>}
        </Space>
      ),
    },
    {
      title: t('type', '类型'),
      dataIndex: 'type',
      width: 100,
      search: true,
      valueType: 'select',
      valueEnum: {
        announcement: { text: t('announcement', '公告') },
        notice: { text: t('notice', '通知') },
      },
    },
    {
      title: t('source', '来源'),
      dataIndex: 'source',
      width: 100,
      search: false,
      render: (_, row) => (
        <Tag color={row.source === 'platform' ? 'purple' : 'green'}>
          {row.source === 'platform'
            ? t('platformSource', '平台')
            : t('tenantSource', '本租户')}
        </Tag>
      ),
    },
    {
      title: t('publishAt', '发布时间'),
      dataIndex: 'publishAt',
      width: 180,
      search: false,
      render: (_, row) => row.publishAt ?? '-',
    },
    {
      title: t('createdAt', '接收时间'),
      dataIndex: 'createdAt',
      width: 180,
      search: false,
    },
    {
      title: t('actions', '操作'),
      valueType: 'option',
      width: 90,
      render: (_, row) => [
        <Button key="view" type="link" onClick={() => void openMessage(row)}>
          {t('view', '查看')}
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer
      title={
        <Space>
          {t('inbox', '我的消息')}
          {unreadTotal > 0 && <Tag color="red">{unreadTotal}</Tag>}
        </Space>
      }
      content={t(
        'inboxHelp',
        '这里汇总平台公告、平台定向通知和本租户通知公告。阅读后会自动标记为已读。',
      )}
      extra={[
        <Button key="readAll" onClick={() => void readAll()}>
          {t('readAll', '全部已读')}
        </Button>,
      ]}
    >
      <ProTable<InboxNotification>
        rowKey="id"
        actionRef={action}
        columns={columns}
        params={{ status }}
        request={async (params) => {
          try {
            const response = await listInbox({
              current: params.current,
              pageSize: params.pageSize,
              type: params.type as BackendAPI.listInboxNotificationsParams['type'],
              status,
            });
            setUnreadTotal(response.unreadTotal);
            return response;
          } catch (error) {
            const detail = (
              error as { response?: { data?: { errorMessage?: string } } }
            ).response?.data?.errorMessage;
            message.error(detail ?? t('loadFailed', '消息加载失败'));
            return { data: [], success: false, total: 0 };
          }
        }}
        toolBarRender={() => [
          <Segmented<InboxStatus>
            key="status"
            value={status}
            onChange={(value) => setStatus(value as InboxStatus)}
            options={[
              { label: t('all', '全部'), value: 'all' },
              { label: t('unread', '未读'), value: 'unread' },
              { label: t('read', '已读'), value: 'read' },
            ]}
          />,
        ]}
      />
      <Modal
        open={active !== null}
        title={active?.title}
        width={860}
        destroyOnHidden
        footer={
          <Button type="primary" onClick={() => setActive(null)}>
            {t('close', '关闭')}
          </Button>
        }
        onCancel={() => setActive(null)}
      >
        {/* 后端写入前已消毒；这里再次消毒后渲染，避免直接注入不可信 HTML。 */}
        <div
          className={styles.content}
          dangerouslySetInnerHTML={{ __html: safeContent }}
        />
      </Modal>
    </PageContainer>
  );
}
