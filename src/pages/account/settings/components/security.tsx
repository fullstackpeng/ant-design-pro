import { ProForm, ProFormText } from '@ant-design/pro-components';
import { useQueryClient } from '@tanstack/react-query';
import { history, useModel } from '@umijs/max';
import { App, Button, Card, Popconfirm } from 'antd';
import React, { useState } from 'react';
import {
  changeAccountPassword,
  revokeOtherAccountSessions,
} from '../../service';
import type { AccountText } from '../../useAccountProfile';

interface PasswordForm extends BackendAPI.ChangeAccountPasswordDto {
  confirmPassword: string;
}

export default function SecurityView({
  report,
  t,
}: {
  report: (error: unknown) => void;
  t: AccountText;
}) {
  const { message } = App.useApp();
  const { setInitialState } = useModel('@@initialState');
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const revokeOthers = async () => {
    setPending(true);
    try {
      await revokeOtherAccountSessions();
      message.success(t('sessionsRevoked', '其他登录已退出，当前登录保持有效'));
    } catch (error) {
      report(error);
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="flex flex-col gap-6 py-4">
      <Card title={t('changePassword', '修改密码')}>
        <p className="mb-6 text-neutral-500">
          {t(
            'passwordHint',
            '修改后，该账号在所有企业中的登录都会退出，需要使用新密码重新登录。',
          )}
        </p>
        <ProForm<PasswordForm>
          layout="vertical"
          onFinish={async (values) => {
            setPending(true);
            try {
              await changeAccountPassword({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
              });
            } catch (error) {
              report(error);
              setPending(false);
              return false;
            }
            await queryClient.cancelQueries();
            queryClient.clear();
            window.sessionStorage.removeItem('tenantId');
            await setInitialState((state) => ({
              ...state,
              currentUser: undefined,
              navigation: undefined,
            }));
            message.success(t('passwordChanged', '密码已修改，请重新登录'));
            history.replace('/user/login');
            return true;
          }}
          submitter={{
            searchConfig: { submitText: t('changePassword', '修改密码') },
            resetButtonProps: false,
            submitButtonProps: { loading: pending, disabled: pending },
          }}
        >
          <ProFormText.Password
            name="currentPassword"
            label={t('currentPassword', '当前密码')}
            width="md"
            fieldProps={{ autoComplete: 'current-password' }}
            rules={[{ required: true }, { max: 1024 }]}
          />
          <ProFormText.Password
            name="newPassword"
            label={t('newPassword', '新密码')}
            width="md"
            fieldProps={{ autoComplete: 'new-password' }}
            rules={[
              { required: true },
              {
                min: 8,
                max: 1024,
                message: t('passwordLength', '密码长度为 8～1024 个字符'),
              },
            ]}
          />
          <ProFormText.Password
            name="confirmPassword"
            label={t('confirmPassword', '确认新密码')}
            width="md"
            dependencies={['newPassword']}
            fieldProps={{ autoComplete: 'new-password' }}
            rules={[
              { required: true },
              ({ getFieldValue }) => ({
                validator: (_, value) =>
                  value === getFieldValue('newPassword')
                    ? Promise.resolve()
                    : Promise.reject(
                        new Error(
                          t('passwordMismatch', '两次输入的新密码不一致'),
                        ),
                      ),
              }),
            ]}
          />
        </ProForm>
      </Card>
      <Card title={t('loginSecurity', '登录安全')}>
        <p className="mb-4">
          {t(
            'revokeHint',
            '退出该账号在所有企业中的其他登录，保留当前浏览器会话。',
          )}
        </p>
        <Popconfirm
          title={t('revokeConfirm', '确认退出其他登录？')}
          onConfirm={revokeOthers}
          disabled={pending}
        >
          <Button danger disabled={pending} loading={pending}>
            {t('revokeOthers', '退出其他登录')}
          </Button>
        </Popconfirm>
      </Card>
    </div>
  );
}
