import {
  AppstoreOutlined, BarChartOutlined, CheckCircleOutlined, CloseCircleOutlined, CreditCardOutlined,
  CrownOutlined, DashboardOutlined, DesktopOutlined, FormOutlined, HomeOutlined,
  IdcardOutlined, MenuOutlined, MonitorOutlined, OrderedListOutlined,
  ProfileOutlined, ProjectOutlined, ReadOutlined, RobotOutlined, SettingOutlined, TableOutlined,
  TeamOutlined, UnorderedListOutlined, UserAddOutlined, UserOutlined,
} from '@ant-design/icons';
import React from 'react';
import * as navigation from './backend/navigation';

export const currentNavigation = () => navigation.currentNavigation({ skipErrorHandler: true });

// Resolve persisted icon codes through a local whitelist.
const icons: Record<string, React.ReactNode> = {
  home: <HomeOutlined />, dashboard: <DashboardOutlined />, team: <TeamOutlined />,
  setting: <SettingOutlined />, menu: <MenuOutlined />, crown: <CrownOutlined />,
  barChart: <BarChartOutlined />, monitor: <MonitorOutlined />, desktop: <DesktopOutlined />,
  form: <FormOutlined />, orderedList: <OrderedListOutlined />, profile: <ProfileOutlined />,
  table: <TableOutlined />, read: <ReadOutlined />, project: <ProjectOutlined />,
  appstore: <AppstoreOutlined />, unorderedList: <UnorderedListOutlined />,
  creditCard: <CreditCardOutlined />, idcard: <IdcardOutlined />, checkCircle: <CheckCircleOutlined />,
  closeCircle: <CloseCircleOutlined />, user: <UserOutlined />, userAdd: <UserAddOutlined />,
  robot: <RobotOutlined />,
};

export interface NavigationMenu {
  key: string;
  name: string;
  path?: string;
  icon?: React.ReactNode;
  children?: NavigationMenu[];
}

export function menuTarget(menus: BackendAPI.MenuDto[], pathname: string): string {
  const menu = menus.find(item => item.path === pathname);
  if (!menu) return pathname;
  const firstPage = (item: BackendAPI.MenuDto): string | undefined => {
    if (item.kind === 'page' && item.path) return item.path;
    for (const child of menus.filter(child => child.parentCode === item.code)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))) {
      const target = firstPage(child);
      if (target) return target;
    }
    return undefined;
  };
  return firstPage(menu) ?? pathname;
}

export function menuTree(menus: BackendAPI.MenuDto[], parentCode: string | null = null, translate?: (key: string, fallback: string) => string): NavigationMenu[] {
  return menus.filter(menu => menu.parentCode === parentCode && menu.code !== 'account' && !menu.path?.startsWith('/account/'))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
    .map(menu => {
      const children = menuTree(menus, menu.code, translate);
      return {
        key: menu.code, name: menu.i18nKey && translate ? translate(menu.i18nKey, menu.name) : menu.name, path: menu.path ?? undefined, icon: icons[menu.icon],
        ...(children.length ? { children } : {}),
      };
    });
}
