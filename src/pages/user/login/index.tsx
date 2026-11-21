import {
  ApartmentOutlined,
  LockOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  LoginForm,
  ProFormCheckbox,
  ProFormSelect,
  ProFormText,
} from '@ant-design/pro-components';
import {
  FormattedMessage,
  Helmet,
  SelectLang,
  useIntl,
  useModel,
} from '@umijs/max';
import { Alert, App, Button, ConfigProvider, Tabs } from 'antd';
import { createStyles } from 'antd-style';
import React, { startTransition, useState } from 'react';
import { Footer } from '@/components';
import { type LoginParams, login } from '@/services/auth';
import { defaultSiteSettings } from '@/services/siteSettings';
import { queryHello, queryLoginTenants } from './service';

/**
 * Validate redirect URL to prevent open redirect attacks.
 * Only allow same-origin relative paths starting with '/'.
 */
const getSafeRedirectUrl = (redirect: string | null): string => {
  if (!redirect?.startsWith('/')) return '/welcome';

  if (redirect.startsWith('//')) return '/welcome';

  try {
    const parsed = new URL(redirect, window.location.origin);
    if (parsed.origin !== window.location.origin) return '/welcome';
    if (parsed.pathname === '/') return '/welcome';
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return '/welcome';
  }
};

const useStyles = createStyles(({ token }) => {
  return {
    lang: {
      width: 42,
      height: 42,
      lineHeight: '42px',
      position: 'fixed',
      right: 16,
      borderRadius: token.borderRadius,
      ':hover': {
        backgroundColor: token.colorBgTextHover,
      },
    },
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'auto',
      backgroundSize: '100% 100%',
    },
  };
});

const Lang = () => {
  const { styles } = useStyles();

  return (
    <div className={styles.lang} data-lang>
      {SelectLang && <SelectLang />}
    </div>
  );
};

const LoginMessage: React.FC<{
  content: string;
}> = ({ content }) => {
  return (
    <Alert
      style={{
        marginBottom: 24,
      }}
      title={content}
      type="error"
      showIcon
    />
  );
};

const Login: React.FC = () => {
  const [loginError, setLoginError] = useState('');
  const [helloLoading, setHelloLoading] = useState(false);
  const [helloResult, setHelloResult] = useState('');
  const { initialState, setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();
  const siteSettings = initialState?.siteSettings ?? defaultSiteSettings;
  const { message } = App.useApp();
  const intl = useIntl();

  const handleHello = async () => {
    setHelloLoading(true);
    setHelloResult('');
    try {
      const result = await queryHello();
      setHelloResult(result.data.message);
    } catch {
      setHelloResult(
        intl.formatMessage({
          id: 'pages.login.hello.failure',
          defaultMessage: '连接失败，请确认后端已启动。',
        }),
      );
    } finally {
      setHelloLoading(false);
    }
  };

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (userInfo) {
      startTransition(() => {
        setInitialState((s) => ({
          ...s,
          currentUser: userInfo,
        }));
      });
    } else {
      throw new Error('Failed to load current user');
    }
  };

  const handleSubmit = async (values: LoginParams) => {
    setLoginError('');
    try {
      const msg = await login({ ...values, type: 'account' });
      if (msg.success) {
        window.sessionStorage.removeItem('tenantId');
        await fetchUserInfo();
        const defaultLoginSuccessMessage = intl.formatMessage({
          id: 'pages.login.success',
          defaultMessage: '登录成功！',
        });
        message.success(defaultLoginSuccessMessage);
        const urlParams = new URL(window.location.href).searchParams;
        const redirectUrl = getSafeRedirectUrl(urlParams.get('redirect'));
        window.location.href = redirectUrl;
        return;
      }
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response
        ?.status;
      if (status === 401) {
        setLoginError(
          intl.formatMessage({
            id: 'pages.login.invalidTenantCredentials',
            defaultMessage: '租户或账号信息不正确，或无权访问该租户',
          }),
        );
        return;
      }
      const defaultLoginFailureMessage = intl.formatMessage({
        id: 'pages.login.failure',
        defaultMessage: '登录失败，请重试！',
      });
      message.error(defaultLoginFailureMessage);
    }
  };

  return (
    <ConfigProvider
      theme={{ token: { colorPrimary: siteSettings.colorPrimary } }}
    >
      <div
        className={styles.container}
        style={{
          backgroundImage: siteSettings.loginBackground
            ? `url(${JSON.stringify(siteSettings.loginBackground)})`
            : 'none',
        }}
      >
        <Helmet>
          <title>
            {intl.formatMessage({
              id: 'menu.login',
              defaultMessage: '登录页',
            })}
            {siteSettings.title && ` - ${siteSettings.title}`}
          </title>
        </Helmet>
        <Lang />
        <div
          style={{
            flex: '1',
            padding: '32px 0',
          }}
        >
          <LoginForm
            contentStyle={{
              minWidth: 280,
              maxWidth: '75vw',
            }}
            logo={
              siteSettings.logo ? (
                <img alt="logo" src={siteSettings.logo} />
              ) : undefined
            }
            title={siteSettings.title}
            subTitle={intl.formatMessage({
              id: 'pages.layouts.userLayout.title',
            })}
            initialValues={{
              autoLogin: true,
            }}
            onFinish={async (values) => {
              await handleSubmit(values as LoginParams);
            }}
          >
            <Tabs
              activeKey="account"
              centered
              items={[
                {
                  key: 'account',
                  label: intl.formatMessage({
                    id: 'pages.login.accountLogin.tab',
                    defaultMessage: '账户密码登录',
                  }),
                },
              ]}
            />

            {loginError && <LoginMessage content={loginError} />}
            <ProFormSelect
              name="tenantCode"
              showSearch
              debounceTime={300}
              request={async ({ keyWords }: { keyWords?: string }) => {
                const platform = {
                  value: 'platform',
                  label: intl.formatMessage({
                    id: 'pages.login.platformTenant',
                    defaultMessage: '平台端',
                  }),
                };
                try {
                  const { data } = await queryLoginTenants({
                    keyword: keyWords?.trim() || undefined,
                    limit: 50,
                  });
                  return [
                    platform,
                    ...data.map((tenant) => ({
                      value: tenant.code,
                      label: `${tenant.name} (${tenant.code})`,
                    })),
                  ];
                } catch {
                  return [platform];
                }
              }}
              fieldProps={{
                size: 'large',
                prefix: <ApartmentOutlined />,
                optionFilterProp: 'label',
                placeholder: intl.formatMessage({
                  id: 'pages.login.tenantCode.placeholder',
                  defaultMessage: '请选择或搜索租户编码',
                }),
              }}
              rules={[
                {
                  required: true,
                  message: intl.formatMessage({
                    id: 'pages.login.tenantCode.required',
                    defaultMessage: '请选择租户编码',
                  }),
                },
                {
                  pattern: /^[a-z0-9][a-z0-9-]{0,63}$/,
                  message: intl.formatMessage({
                    id: 'pages.login.tenantCode.invalid',
                    defaultMessage: '租户编码仅支持小写字母、数字和连字符',
                  }),
                },
              ]}
            />
            <ProFormText
              name="username"
              fieldProps={{
                size: 'large',
                prefix: <UserOutlined />,
              }}
              placeholder={intl.formatMessage({
                id: 'pages.login.accountUsername.placeholder',
                defaultMessage: '请输入用户名',
              })}
              rules={[
                {
                  required: true,
                  message: (
                    <FormattedMessage
                      id="pages.login.username.required"
                      defaultMessage="请输入用户名!"
                    />
                  ),
                },
              ]}
            />
            <ProFormText.Password
              name="password"
              fieldProps={{
                size: 'large',
                prefix: <LockOutlined />,
              }}
              placeholder={intl.formatMessage({
                id: 'pages.login.accountPassword.placeholder',
                defaultMessage: '请输入密码',
              })}
              rules={[
                {
                  required: true,
                  message: (
                    <FormattedMessage
                      id="pages.login.password.required"
                      defaultMessage="请输入密码！"
                    />
                  ),
                },
              ]}
            />

            <div
              style={{
                marginBottom: 24,
              }}
            >
              <ProFormCheckbox noStyle name="autoLogin">
                <FormattedMessage
                  id="pages.login.rememberMe"
                  defaultMessage="自动登录"
                />
              </ProFormCheckbox>
            </div>
          </LoginForm>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 text-center">
              <Button loading={helloLoading} onClick={handleHello}>
                <FormattedMessage
                  id="pages.login.hello.check"
                  defaultMessage="测试后端连接"
                />
              </Button>
              <p role="status" aria-live="polite">
                {helloResult}
              </p>
            </div>
          )}
        </div>
        <Footer />
      </div>
    </ConfigProvider>
  );
};

export default Login;
