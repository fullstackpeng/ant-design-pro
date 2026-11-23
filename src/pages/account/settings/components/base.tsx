import { ProForm, ProFormText } from '@ant-design/pro-components';
import { App, Avatar, Button, Popconfirm, Space, Upload } from 'antd';
import React, { useState } from 'react';
import {
  type AccountProfile,
  removeAccountAvatar,
  updateAccountProfile,
  uploadAccountAvatar,
} from '../../service';
import type { AccountText } from '../../useAccountProfile';

export default function BaseView({
  profile,
  refresh,
  report,
  t,
}: {
  profile: AccountProfile;
  refresh: () => Promise<void>;
  report: (error: unknown) => void;
  t: AccountText;
}) {
  const { message } = App.useApp();
  const [pending, setPending] = useState(false);
  const save = async (work: () => Promise<unknown>) => {
    setPending(true);
    try {
      await work();
      await refresh();
      message.success(t('saved', '修改已保存'));
      return true;
    } catch (error) {
      report(error);
      return false;
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="grid gap-8 py-4 lg:grid-cols-[1fr_280px]">
      <ProForm<BackendAPI.UpdateAccountProfileDto>
        key={`${profile.userId}:${profile.name}`}
        layout="vertical"
        initialValues={{ name: profile.name }}
        onFinish={(values) =>
          save(() => updateAccountProfile({ name: values.name }))
        }
        submitter={{
          searchConfig: { submitText: t('saveProfile', '保存资料') },
          resetButtonProps: false,
          submitButtonProps: { loading: pending, disabled: pending },
        }}
      >
        <ProFormText
          name="username"
          initialValue={profile.username}
          label={t('username', '用户名')}
          readonly
        />
        <ProFormText
          name="name"
          label={t('displayName', '显示名称')}
          width="md"
          rules={[
            {
              required: true,
              whitespace: true,
              message: t('nameRequired', '请输入显示名称'),
            },
            { max: 100, message: t('nameMax', '显示名称不能超过 100 个字符') },
          ]}
        />
      </ProForm>
      <div className="flex flex-col items-center gap-4">
        <Avatar size={96} src={profile.avatar ?? undefined}>
          {profile.name.slice(0, 1)}
        </Avatar>
        <Space wrap>
          <Upload
            accept="image/png,image/jpeg,image/gif,image/webp"
            showUploadList={false}
            disabled={pending}
            beforeUpload={(file) => {
              if (
                ![
                  'image/png',
                  'image/jpeg',
                  'image/gif',
                  'image/webp',
                ].includes(file.type) ||
                file.size === 0 ||
                file.size > 2 * 1024 * 1024
              ) {
                message.error(
                  t(
                    'avatarLimit',
                    '请选择不超过 2 MB 的 PNG、JPEG、GIF 或 WebP 图片',
                  ),
                );
                return Upload.LIST_IGNORE;
              }
              void save(() => uploadAccountAvatar(file));
              return false;
            }}
          >
            <Button loading={pending} disabled={pending}>
              {t('uploadAvatar', '更换头像')}
            </Button>
          </Upload>
          {profile.avatar && (
            <Popconfirm
              title={t('removeAvatarConfirm', '确认移除头像？')}
              onConfirm={() => save(removeAccountAvatar)}
              disabled={pending}
            >
              <Button disabled={pending}>
                {t('removeAvatar', '移除头像')}
              </Button>
            </Popconfirm>
          )}
        </Space>
        <p className="text-sm text-neutral-500">
          {t('avatarHelp', '支持 PNG、JPEG、GIF、WebP，最大 2 MB。')}
        </p>
      </div>
    </div>
  );
}
