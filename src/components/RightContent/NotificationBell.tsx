import { BellOutlined } from '@ant-design/icons';
import { useQueryClient } from '@tanstack/react-query';
import { history, useIntl, useLocation } from '@umijs/max';
import {
  Badge,
  Button,
  Empty,
  Listy,
  Popover,
  Spin,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { createStyles } from 'antd-style';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useState } from 'react';
import {
  listInboxNotifications,
  readNotification,
} from '@/services/backend/notifications';
import useHeaderActionStyles from './style';

const useStyles = createStyles(({ token, css }) => ({
  panel: css`
    width: 360px;
    max-width: calc(100vw - 32px);
  `,
  header: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px;
    border-bottom: 1px solid ${token.colorBorderSecondary};
  `,
  empty: css`
    padding: 32px 16px;
  `,
  item: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    min-height: 48px;
    padding: 8px 16px;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover {
      background: ${token.colorBgTextHover};
    }
  `,
  title: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  `,
  time: css`
    color: ${token.colorTextTertiary};
    font-size: 12px;
    white-space: nowrap;
  `,
}));

/** 右上角消息入口：展示最新消息与未读数，点击条目后跳转消息中心。 */
export const NotificationBell: React.FC = () => {
  const intl = useIntl();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { styles } = useStyles();
  const { styles: actionStyles } = useHeaderActionStyles();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<BackendAPI.NotificationDto[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id: `messageCenter.${id}`, defaultMessage });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listInboxNotifications(
        { current: 1, pageSize: 5 },
        { skipErrorHandler: true },
      );
      setItems(response.data);
      setUnreadTotal(response.unreadTotal);
    } catch {
      // 消息中心是辅助入口，加载失败时不打断当前页面操作。
    } finally {
      setLoading(false);
    }
  }, []);

  // 挂载时与路由切换后刷新未读数；展开弹层时再刷新一次列表。
  useEffect(() => {
    void load();
  }, [load, location.pathname]);

  const openMessage = useCallback(
    async (record: BackendAPI.NotificationDto) => {
      setOpen(false);
      history.push('/message-center/inbox');
      if (record.readAt) return;
      try {
        await readNotification({ id: record.id }, { skipErrorHandler: true });
        const readAt = new Date().toISOString();
        setItems((current) =>
          current.map((item) =>
            item.id === record.id ? { ...item, readAt } : item,
          ),
        );
        setUnreadTotal((count) => Math.max(0, count - 1));
        void queryClient.invalidateQueries({
          queryKey: ['notification-inbox'],
        });
      } catch {
        // 标记失败仍允许跳转，消息中心内可重试。
      }
    },
    [queryClient],
  );

  const content = (
    <div className={styles.panel}>
      <div className={styles.header}>
        <Typography.Text strong>{t('inbox', '我的消息')}</Typography.Text>
        <Button
          type="link"
          size="small"
          onClick={() => {
            setOpen(false);
            history.push('/message-center/inbox');
          }}
        >
          {t('viewAll', '查看全部')}
        </Button>
      </div>
      <Spin spinning={loading}>
        {items.length === 0 && !loading ? (
          <div className={styles.empty}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('empty', '暂无消息')}
            />
          </div>
        ) : (
          <Listy
            items={items}
            rowKey="id"
            height={Math.min(items.length * 56, 360)}
            itemRender={(item) => (
              <button
                type="button"
                className={styles.item}
                onClick={() => void openMessage(item)}
              >
                <span className={styles.title}>
                  {!item.readAt && <Badge dot />}
                  <Typography.Text ellipsis>{item.title}</Typography.Text>
                  {item.type === 'announcement' && (
                    <Tag>{t('announcement', '公告')}</Tag>
                  )}
                </span>
                <span className={styles.time}>
                  {dayjs(item.publishAt ?? item.createdAt).fromNow()}
                </span>
              </button>
            )}
          />
        )}
      </Spin>
    </div>
  );

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void load();
      }}
      content={content}
      styles={{ content: { padding: 0 } }}
    >
      <Badge count={unreadTotal} overflowCount={99} size="small">
        <Tooltip title={t('inbox', '我的消息')}>
          <Button
            type="text"
            className={actionStyles.action}
            aria-label={t('inbox', '我的消息')}
            icon={<BellOutlined />}
          />
        </Tooltip>
      </Badge>
    </Popover>
  );
};
