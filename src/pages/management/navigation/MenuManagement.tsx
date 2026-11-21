import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Button, Popconfirm } from 'antd';
import React, { useRef, useState } from 'react';
import { currentNavigation } from '@/services/navigation';
import { useManagement } from '../useManagement';
import MenuEditor from './MenuEditor';
import {
  deleteMenu,
  listFeatures,
  listMenus,
  listRegisteredPages,
} from './service';
import { type MenuRow, menuRows } from './tree';

interface Props {
  scope: 'platform' | 'tenant';
  includeAuthenticated?: boolean;
}

export default function MenuManagement({ scope, includeAuthenticated }: Props) {
  const { t, run, report, pending } = useManagement();
  const { setInitialState } = useModel('@@initialState');
  const action = useRef<ActionType | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<readonly React.Key[]>([]);
  const [catalog, setCatalog] = useState<{
    menus: BackendAPI.MenuDto[];
    pages: BackendAPI.RegisteredPageDto[];
    features: BackendAPI.FeatureDto[];
  }>();
  const [editor, setEditor] = useState<{
    menu?: BackendAPI.MenuDto;
    parentCode?: string;
  }>();
  const isTenant = scope === 'tenant';
  const refresh = async () => {
    const { data } = await currentNavigation();
    await setInitialState((state) => ({ ...state, navigation: data }));
    await action.current?.reload();
  };
  const columns: ProColumns<MenuRow>[] = [
    { title: t('menuName', '菜单名称'), dataIndex: 'name' },
    {
      title: t('menuKind', '类型'),
      dataIndex: 'kind',
      valueEnum: { directory: t('directory', '目录'), page: t('page', '页面') },
    },
    { title: t('menuPath', '页面路径'), dataIndex: 'path' },
    {
      title: t('featureModule', '授权模块'),
      render: (_, row) =>
        row.kind === 'directory'
          ? t('childrenDetermine', '按子菜单汇总')
          : (catalog?.features.find(
              (feature) => feature.code === row.featureCode,
            )?.name ?? '-'),
    },
    {
      title: t('menuScope', '所属端'),
      dataIndex: 'scope',
      valueEnum: {
        platform: t('platform', '平台'),
        tenant: t('tenant', '租户'),
        authenticated: t('shared', '公共'),
      },
    },
    {
      title: t('menuRole', '最低角色'),
      dataIndex: 'minRole',
      render: (_, row) =>
        row.kind === 'directory'
          ? '-'
          : row.scope === 'platform'
            ? t('platformAdmin', '平台管理员')
            : row.scope === 'authenticated'
              ? t('signedIn', '已登录用户')
              : row.minRole === 'admin'
                ? t('admin', '管理员')
                : t('user', '成员'),
    },
    { title: t('menuOrder', '排序'), dataIndex: 'sortOrder' },
    {
      title: t('menuVisible', '显示入口'),
      dataIndex: 'isActive',
      valueEnum: { true: t('enabled', '启用'), false: t('disabled', '停用') },
    },
    {
      title: t('actions', '操作'),
      valueType: 'option',
      render: (_, row) => [
        <Button key="edit" type="link" onClick={() => setEditor({ menu: row })}>
          {t('edit', '编辑')}
        </Button>,
        ...(row.kind === 'directory' && row.scope !== 'authenticated'
          ? [
              <Button
                key="child"
                type="link"
                onClick={() => setEditor({ parentCode: row.code })}
              >
                {t('addChildMenu', '新增子菜单')}
              </Button>,
            ]
          : []),
        ...(!row.isSystem
          ? [
              <Popconfirm
                key="delete"
                title={t(
                  'deleteMenuConfirm',
                  '删除该菜单入口？模块授权与业务数据将保留。',
                )}
                onConfirm={() =>
                  run(
                    async () => {
                      await deleteMenu(row.code);
                      await refresh();
                    },
                    () => {},
                  )
                }
              >
                <Button
                  type="link"
                  danger
                  disabled={pending || !!row.children?.length}
                >
                  {t('deleteMenu', '删除')}
                </Button>
              </Popconfirm>,
            ]
          : []),
      ],
    },
  ];
  return (
    <PageContainer
      title={
        isTenant
          ? t('tenantMenuManagement', '租户菜单')
          : t('platformMenuManagement', '平台菜单')
      }
      content={
        isTenant
          ? t(
              'tenantMenusHelp',
              '维护租户端目录和页面入口。租户按功能模块授权，隐藏或删除菜单不会撤销页面和接口权限。',
            )
          : t(
              'platformMenusHelp',
              '维护平台端及公共菜单。平台菜单由代码托管，可调整名称、图标和排序，不能停用或改变层级。',
            )
      }
    >
      <ProTable<MenuRow>
        rowKey="code"
        actionRef={action}
        columns={columns}
        search={false}
        pagination={false}
        expandable={{
          expandedRowKeys: expandedKeys,
          onExpandedRowsChange: setExpandedKeys,
        }}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            disabled={!catalog}
            onClick={() => setEditor({})}
          >
            {t('createMenu', '新增菜单')}
          </Button>,
        ]}
        request={async () => {
          try {
            const [menus, pages, features] = await Promise.all([
              listMenus(),
              listRegisteredPages(),
              listFeatures(),
            ]);
            const visibleMenus = menus.data.filter((menu) =>
              includeAuthenticated
                ? menu.scope !== 'tenant'
                : menu.scope === scope,
            );
            const visiblePages = pages.data.filter((page) =>
              includeAuthenticated
                ? page.scope !== 'tenant'
                : page.scope === scope,
            );
            setCatalog({
              menus: visibleMenus,
              pages: visiblePages,
              features: features.data,
            });
            setExpandedKeys(
              visibleMenus
                .filter((menu) => menu.kind === 'directory')
                .map((menu) => menu.code),
            );
            return {
              success: true,
              data: menuRows(visibleMenus),
              total: visibleMenus.length,
            };
          } catch (error) {
            setCatalog(undefined);
            report(error);
            return { success: false, data: [] };
          }
        }}
      />
      {editor && catalog && (
        <MenuEditor
          {...editor}
          {...catalog}
          fixedScope={scope}
          onSaved={refresh}
          onClose={() => setEditor(undefined)}
        />
      )}
    </PageContainer>
  );
}
