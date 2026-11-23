import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormDatePicker,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { useQueryClient } from '@tanstack/react-query';
import { useModel } from '@umijs/max';
import { App, Button, Form, Tag } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';
import RichTextEditor from '@/components/RichTextEditor';
import { useManagement } from '../useManagement';
import {
  createNotification,
  deleteNotification,
  listMembers,
  listNotifications,
  listTenants,
  type Notification,
  type NotificationFormValues,
  type NotificationScope,
  updateNotification,
  uploadImage as uploadNotificationImage,
} from './service';

function toIso(value: unknown) {
  if (!value) return undefined;
  return dayjs.isDayjs(value) ? value.toISOString() : String(value);
}

function hasText(html: string | undefined) {
  return Boolean(
    html
      ?.replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim(),
  );
}

export default function Notifications({ scope }: { scope: NotificationScope }) {
  const { t, run, load, report, pending } = useManagement();
  const { modal } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const queryClient = useQueryClient();
  const action = useRef<ActionType | null>(null);
  const [form] = Form.useForm<NotificationFormValues>();
  const [editing, setEditing] = useState<Notification | null | undefined>();
  const [tenants, setTenants] = useState<BackendAPI.TenantDto[]>([]);
  const [members, setMembers] = useState<BackendAPI.MemberDto[]>([]);
  const notificationType = Form.useWatch('type', form);
  const selectedTenantIds =
    (Form.useWatch('targetTenantIds', form) as string[] | undefined) ?? [];
  const allTenantsSelected =
    tenants.length > 0 && selectedTenantIds.length === tenants.length;
  const selectedMemberIds =
    (Form.useWatch('targetUserIds', form) as string[] | undefined) ?? [];
  const allMembersSelected =
    members.length > 0 && selectedMemberIds.length === members.length;
  const permissions = initialState?.navigation?.permissions ?? [];
  const canCreate =
    scope === 'platform'
      ? initialState?.currentUser?.isPlatformAdmin === true
      : permissions.includes('notifications:create');
  const canUpdate =
    scope === 'platform'
      ? initialState?.currentUser?.isPlatformAdmin === true
      : permissions.includes('notifications:update');
  const canDelete =
    scope === 'platform'
      ? initialState?.currentUser?.isPlatformAdmin === true
      : permissions.includes('notifications:delete');

  useEffect(() => {
    if (editing === undefined) return;
    if (scope === 'platform') {
      void listTenants()
        .then((response) => setTenants(response.data))
        .catch(report);
    } else {
      void listMembers()
        .then((response) => setMembers(response.data))
        .catch(report);
    }
  }, [editing, report, scope]);

  // ModalForm 复用同一个 form 实例时，initialValues 只在首次挂载时生效。
  // 每次打开（新建或编辑）显式重置并写入初始值，避免残留上一次的表单数据。
  useEffect(() => {
    if (editing === undefined) return;
    const values = {
      type: 'announcement',
      isActive: true,
      ...(editing
        ? {
            title: editing.title,
            contentHtml: editing.contentHtml,
            isActive: editing.isActive,
            publishAt: editing.publishAt ? dayjs(editing.publishAt) : null,
            expireAt: editing.expireAt ? dayjs(editing.expireAt) : null,
            targetTenantIds: editing.targetTenantIds,
            targetUserIds: editing.targetUserIds,
          }
        : {}),
    };
    form.resetFields();
    // 日期字段在表单里是 Dayjs 对象，与提交 DTO 的字符串类型不同。
    form.setFieldsValue(values as unknown as Partial<NotificationFormValues>);
  }, [editing, form]);

  // 下拉框顶部的“全选/取消全选”按钮。阻止 mousedown 默认行为，避免点击时收起下拉框。
  const selectAllPopup =
    (
      allSelected: boolean,
      allLabel: string,
      clearLabel: string,
      onToggle: () => void,
    ) =>
    (originNode: React.ReactElement) => (
      <>
        <div
          style={{
            display: 'flex',
            padding: '4px 12px',
            borderBottom: '1px solid rgba(5, 5, 5, 0.06)',
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <Button type="link" size="small" onClick={onToggle}>
            {allSelected ? clearLabel : allLabel}
          </Button>
        </div>
        {originNode}
      </>
    );

  const columns: ProColumns<Notification>[] = [
    {
      title: t('notificationTitle', '标题'),
      dataIndex: 'title',
      ellipsis: true,
    },
    {
      title: t('notificationType', '类型'),
      dataIndex: 'type',
      width: 100,
      search: true,
      valueType: 'select',
      valueEnum: {
        announcement: { text: t('announcement', '公告') },
        notice: { text: t('notice', '通知') },
      },
      render: (_, row) => (
        <Tag color={row.type === 'announcement' ? 'blue' : 'gold'}>
          {row.type === 'announcement'
            ? t('announcement', '公告')
            : t('notice', '通知')}
        </Tag>
      ),
    },
    ...(scope === 'platform'
      ? []
      : [
          {
            title: t('source', '来源'),
            dataIndex: 'source',
            width: 100,
            search: false,
            render: (_, row: Notification) => (
              <Tag color={row.source === 'platform' ? 'purple' : 'green'}>
                {row.source === 'platform'
                  ? t('platformSource', '平台')
                  : t('tenantSource', '本租户')}
              </Tag>
            ),
          } as ProColumns<Notification>,
        ]),
    {
      title: t('notificationStatus', '状态'),
      dataIndex: 'isActive',
      width: 90,
      search: false,
      render: (_, row) => (
        <Tag color={row.isActive ? 'green' : undefined}>
          {row.isActive ? t('enabled', '启用') : t('disabled', '停用')}
        </Tag>
      ),
    },
    {
      title: t('publishAt', '发布时间'),
      dataIndex: 'publishAt',
      width: 180,
      search: false,
      render: (_, row) =>
        row.publishAt ? dayjs(row.publishAt).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: t('creator', '创建人'),
      dataIndex: 'creatorName',
      width: 120,
      search: false,
    },
    {
      title: t('createdAt', '创建时间'),
      dataIndex: 'createdAt',
      width: 180,
      search: false,
      render: (_, row) =>
        row.createdAt ? dayjs(row.createdAt).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: t('actions', '操作'),
      valueType: 'option',
      width: canUpdate || canDelete ? 160 : 60,
      render: (_, row) => [
        canUpdate ? (
          <Button key="edit" type="link" onClick={() => setEditing(row)}>
            {t('edit', '编辑')}
          </Button>
        ) : null,
        canDelete ? (
          <Button
            key="delete"
            type="link"
            danger
            onClick={() => {
              void modal.confirm({
                title: t('deleteNotificationConfirm', '删除该通知公告？'),
                content: t(
                  'deleteNotificationHelp',
                  '删除后成员收件箱将不再显示，操作不可恢复。',
                ),
                okText: t('confirmDeleteNotification', '确认删除'),
                cancelText: t('cancel', '取消'),
                onOk: () =>
                  run(
                    () => deleteNotification(scope, row.id),
                    () => {
                      action.current?.reload();
                      void queryClient.invalidateQueries({
                        queryKey: ['notification-inbox'],
                      });
                    },
                  ),
              });
            }}
          >
            {t('delete', '删除')}
          </Button>
        ) : null,
      ],
    },
  ];

  return (
    <PageContainer
      title={
        scope === 'platform'
          ? t('platformNotifications', '平台通知公告')
          : t('tenantNotifications', '通知公告管理')
      }
      content={t(
        scope === 'platform'
          ? 'platformNotificationsHelp'
          : 'tenantNotificationsHelp',
        scope === 'platform'
          ? '平台统一发布，所有租户成员可在消息中心阅读。通知需选择目标租户，公告面向全部租户。'
          : '维护本租户的通知公告。租户无法修改平台发布的内容；通知需选择目标成员，公告面向全部成员。',
      )}
    >
      <ProTable<Notification>
        rowKey="id"
        actionRef={action}
        columns={columns}
        request={(params) =>
          load(() =>
            listNotifications(scope, {
              current: params.current,
              pageSize: params.pageSize,
              type: params.type as BackendAPI.NotificationQueryDto['type'],
              keyword: params.title as string | undefined,
            }),
          )
        }
        toolBarRender={() =>
          canCreate
            ? [
                <Button
                  key="new"
                  type="primary"
                  onClick={() => setEditing(null)}
                >
                  {t('createNotification', '新建通知公告')}
                </Button>,
              ]
            : []
        }
      />
      {editing !== undefined && (
        <ModalForm<NotificationFormValues>
          title={
            editing
              ? t('editNotification', '编辑通知公告')
              : t('createNotification', '新建通知公告')
          }
          open
          width={960}
          form={form}
          submitter={{ submitButtonProps: { loading: pending } }}
          modalProps={{ destroyOnHidden: true }}
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
          onFinish={async (values) => {
            const body: NotificationFormValues = {
              type: values.type,
              title: values.title.trim(),
              contentHtml: values.contentHtml,
              isActive: values.isActive,
              ...(toIso(values.publishAt)
                ? { publishAt: toIso(values.publishAt) }
                : {}),
              ...(toIso(values.expireAt)
                ? { expireAt: toIso(values.expireAt) }
                : {}),
              ...(values.type === 'notice' && scope === 'platform'
                ? { targetTenantIds: values.targetTenantIds ?? [] }
                : {}),
              ...(values.type === 'notice' && scope === 'tenant'
                ? { targetUserIds: values.targetUserIds ?? [] }
                : {}),
            };
            return run(
              () =>
                editing
                  ? updateNotification(scope, editing.id, body)
                  : createNotification(scope, body),
              () => {
                setEditing(undefined);
                action.current?.reload();
                void queryClient.invalidateQueries({
                  queryKey: ['notification-inbox'],
                });
              },
            );
          }}
        >
          <ProFormText
            name="title"
            label={t('notificationTitle', '标题')}
            rules={[{ required: true, whitespace: true }, { max: 100 }]}
          />
          <ProFormSelect
            name="type"
            label={t('notificationType', '类型')}
            options={[
              { label: t('announcement', '公告'), value: 'announcement' },
              { label: t('notice', '通知（定向）'), value: 'notice' },
            ]}
            rules={[{ required: true }]}
          />
          {notificationType === 'notice' && scope === 'platform' && (
            <ProFormSelect
              name="targetTenantIds"
              label={t('targetTenants', '目标租户')}
              mode="multiple"
              showSearch
              options={tenants.map((tenant) => ({
                label: tenant.name,
                value: tenant.id,
              }))}
              fieldProps={{
                popupRender: selectAllPopup(
                  allTenantsSelected,
                  t('selectAllTenants', '全选租户'),
                  t('clearAllTenants', '取消全选'),
                  () =>
                    form.setFieldValue(
                      'targetTenantIds',
                      allTenantsSelected
                        ? []
                        : tenants.map((tenant) => tenant.id),
                    ),
                ),
              }}
              rules={[
                {
                  required: true,
                  message: t('selectTargetTenant', '请选择目标租户'),
                },
              ]}
            />
          )}
          {notificationType === 'notice' && scope === 'tenant' && (
            <ProFormSelect
              name="targetUserIds"
              label={t('targetMembers', '目标成员')}
              mode="multiple"
              showSearch
              options={members.map((member) => ({
                label: `${member.user.name}（${member.user.username}）`,
                value: member.userId,
              }))}
              fieldProps={{
                popupRender: selectAllPopup(
                  allMembersSelected,
                  t('selectAllMembers', '全选成员'),
                  t('clearAllMembers', '取消全选'),
                  () =>
                    form.setFieldValue(
                      'targetUserIds',
                      allMembersSelected
                        ? []
                        : members.map((member) => member.userId),
                    ),
                ),
              }}
              rules={[
                {
                  required: true,
                  message: t('selectMember', '请选择目标成员'),
                },
              ]}
            />
          )}
          <Form.Item
            name="contentHtml"
            label={t('content', '正文')}
            rules={[
              {
                required: true,
                validator: (_rule, value: string) =>
                  hasText(value)
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(t('contentRequired', '请输入正文')),
                      ),
              },
            ]}
          >
            <RichTextEditor
              placeholder={t('contentPlaceholder', '请输入通知公告正文')}
              uploadImage={(file) => uploadNotificationImage(scope, file)}
            />
          </Form.Item>
          <ProFormDatePicker
            name="publishAt"
            label={t('publishAt', '发布时间')}
            showTime
            fieldProps={{ style: { width: '100%' } }}
          />
          <ProFormDatePicker
            name="expireAt"
            label={t('expireAt', '失效时间')}
            showTime
            fieldProps={{ style: { width: '100%' } }}
          />
          <ProFormSwitch name="isActive" label={t('enabled', '启用')} />
        </ModalForm>
      )}
    </PageContainer>
  );
}
