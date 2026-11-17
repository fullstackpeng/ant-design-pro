import {
  LogoutOutlined,
  SettingOutlined,
  SkinOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { history, useIntl, useModel } from '@umijs/max';
import type { MenuProps } from 'antd';
import { App, Spin } from 'antd';
import React, { startTransition } from 'react';
import { outLogin } from '@/services/auth';
import HeaderDropdown from '../HeaderDropdown';

type GlobalHeaderRightProps = {
  children?: React.ReactNode;
};

const loginOut = () => {
  const { search, pathname } = window.location;
  const urlParams = new URL(window.location.href).searchParams;
  const searchParams = new URLSearchParams({
    redirect: pathname + search,
  });
  const redirect = urlParams.get('redirect');
  if (window.location.pathname !== '/user/login' && !redirect) {
    history.replace({
      pathname: '/user/login',
      search: searchParams.toString(),
    });
  }
};

export const AvatarDropdown: React.FC<GlobalHeaderRightProps> = ({
  children,
}) => {
  const { initialState, setInitialState } = useModel('@@initialState');
  const { message } = App.useApp();
  const intl = useIntl();
  const menuItems: MenuProps['items'] = [
    {
      key: 'center',
      icon: <UserOutlined />,
      label: intl.formatMessage({
        id: 'menu.account.center',
        defaultMessage: '个人中心',
      }),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: intl.formatMessage({
        id: 'menu.account.settings',
        defaultMessage: '个人设置',
      }),
    },
    {
      key: 'theme',
      icon: <SkinOutlined />,
      label: intl.formatMessage({
        id: 'menu.account.theme',
        defaultMessage: '主题设置',
      }),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: intl.formatMessage({
        id: 'menu.account.logout',
        defaultMessage: '退出登录',
      }),
    },
  ];

  const onMenuClick: MenuProps['onClick'] = async (event) => {
    const { key } = event;
    if (key === 'logout') {
      try {
        await outLogin();
      } catch {
        message.error(
          intl.formatMessage({
            id: 'pages.login.logoutFailure',
            defaultMessage: '退出失败，请重试。',
          }),
        );
        return;
      }
      startTransition(() => {
        setInitialState((s) => ({
          ...s,
          currentUser: undefined,
          navigation: undefined,
        }));
      });
      window.sessionStorage.removeItem('tenantId');
      loginOut();
      return;
    }
    if (key === 'theme') {
      setInitialState((s) => ({ ...s, settingDrawerOpen: true }));
      return;
    }
    history.push(`/account/${key}`);
  };

  if (!initialState) {
    return <Spin size="small" />;
  }

  const { currentUser } = initialState;

  if (!currentUser) {
    return <Spin size="small" />;
  }

  return (
    <HeaderDropdown
      placement="bottomRight"
      menu={{
        selectedKeys: [],
        onClick: onMenuClick,
        items: menuItems,
      }}
      arrow
    >
      {children}
    </HeaderDropdown>
  );
};
