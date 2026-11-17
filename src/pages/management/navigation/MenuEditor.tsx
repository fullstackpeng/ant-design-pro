import {
  ModalForm,
  ProFormDependency,
  ProFormDigit,
  type ProFormInstance,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTreeSelect,
} from '@ant-design/pro-components';
import React, { useRef } from 'react';
import { useManagement } from '../useManagement';
import { createMenu, updateMenu } from './service';
import { descendants, menuRows } from './tree';

interface MenuForm {
  kind: 'directory' | 'page';
  pageCode?: string;
  scope: 'tenant' | 'platform';
  parentCode: string;
  name: string;
  i18nKey?: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

interface Props {
  menu?: BackendAPI.MenuDto;
  parentCode?: string;
  menus: BackendAPI.MenuDto[];
  pages: BackendAPI.RegisteredPageDto[];
  features: BackendAPI.FeatureDto[];
  onSaved: () => Promise<void>;
  onClose: () => void;
}

interface DirectoryOption {
  value: string;
  title: string;
  children?: DirectoryOption[];
}

export default function MenuEditor({
  menu,
  parentCode,
  menus,
  pages,
  features,
  onSaved,
  onClose,
}: Props) {
  const { t, run } = useManagement();
  const form = useRef<ProFormInstance<MenuForm> | undefined>(undefined);
  const excluded = descendants(menus, menu?.code);
  const usedPaths = new Set(
    menus.filter((item) => item.code !== menu?.code).map((item) => item.path),
  );
  const parent = menus.find((item) => item.code === parentCode);
  const resetParent = (scope?: string) => {
    const selectedParent = menus.find(
      (item) => item.code === form.current?.getFieldValue('parentCode'),
    );
    if (selectedParent && selectedParent.scope !== scope)
      form.current?.setFieldsValue({ parentCode: '__root__' });
  };

  return (
    <ModalForm<MenuForm>
      open
      formRef={form}
      title={menu ? t('editMenu', '编辑菜单') : t('createMenu', '新增菜单')}
      initialValues={
        menu
          ? {
              ...menu,
              parentCode: menu.parentCode ?? '__root__',
              pageCode: pages.find((page) => page.path === menu.path)?.code,
            }
          : {
              kind: 'directory',
              scope: parent?.scope ?? 'tenant',
              parentCode: parentCode ?? '__root__',
              icon: '',
              sortOrder: 0,
              isActive: true,
            }
      }
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onFinish={(values) =>
        run(async () => {
          const body = {
            name: values.name,
            i18nKey: values.i18nKey ?? '',
            icon: values.icon ?? '',
            sortOrder: values.sortOrder,
            isActive: values.isActive,
            parentCode:
              values.parentCode === '__root__' ? null : values.parentCode,
          };
          if (menu) await updateMenu(menu.code, body);
          else
            await createMenu({
              ...body,
              kind: values.kind,
              ...(values.kind === 'page'
                ? { pageCode: values.pageCode }
                : { scope: values.scope }),
            });
          await onSaved();
        }, onClose)
      }
    >
      <ProFormSelect
        name="kind"
        label={t('menuKind', '菜单类型')}
        disabled={!!menu}
        rules={[{ required: true }]}
        options={[
          { value: 'directory', label: t('directory', '目录') },
          { value: 'page', label: t('page', '页面') },
        ]}
      />
      <ProFormDependency name={['kind', 'pageCode', 'scope']}>
        {({ kind, pageCode, scope }) => {
          const selected = pages.find((page) => page.code === pageCode);
          const effectiveScope =
            menu?.scope ??
            (kind === 'page' ? selected?.scope : scope) ??
            'tenant';
          const parentOptions = menuRows(
            menus.filter(
              (item) =>
                item.kind === 'directory' &&
                item.scope === effectiveScope &&
                !excluded.has(item.code),
            ),
          );
          const treeData = (
            rows: ReturnType<typeof menuRows>,
          ): DirectoryOption[] =>
            rows.map((row) => ({
              value: row.code,
              title: row.name,
              ...(row.children ? { children: treeData(row.children) } : {}),
            }));
          return (
            <>
              {kind === 'directory' && !menu && (
                <ProFormSelect
                  name="scope"
                  label={t('menuScope', '所属端')}
                  rules={[{ required: true }]}
                  fieldProps={{ onChange: resetParent }}
                  options={[
                    { value: 'tenant', label: t('tenant', '租户') },
                    { value: 'platform', label: t('platform', '平台') },
                  ]}
                />
              )}
              {kind === 'page' && (
                <>
                  <ProFormSelect
                    name="pageCode"
                    label={t('registeredPage', '已注册页面')}
                    disabled={!!menu}
                    rules={[{ required: true }]}
                    showSearch
                    fieldProps={{
                      optionFilterProp: 'label',
                      onChange: (code) =>
                        resetParent(
                          pages.find((page) => page.code === code)?.scope,
                        ),
                    }}
                    options={pages.map((page) => ({
                      value: page.code,
                      label: `${page.name} · ${page.path}${usedPaths.has(page.path) ? ` (${t('menuExists', '已添加')})` : ''}`,
                      disabled: usedPaths.has(page.path),
                    }))}
                    extra={t(
                      'registeredPageHelp',
                      '仅可选择已发布页面；已添加的页面请编辑现有菜单，或删除入口后重新添加。',
                    )}
                  />
                  {selected && (
                    <p>
                      {t('featureModule', '授权模块')}：
                      {features.find(
                        (feature) => feature.code === selected.featureCode,
                      )?.name ??
                        (selected.scope === 'platform'
                          ? t('platform', '平台')
                          : t('shared', '公共'))}{' '}
                      ·{' '}
                      {selected.scope === 'platform'
                        ? t('platformAdmin', '平台管理员')
                        : selected.scope === 'authenticated'
                          ? t('signedIn', '已登录用户')
                          : selected.minRole === 'admin'
                            ? t('admin', '管理员')
                            : t('user', '成员')}
                    </p>
                  )}
                </>
              )}
              <ProFormTreeSelect
                name="parentCode"
                label={t('parentDirectory', '父目录')}
                disabled={menu?.isSystem}
                rules={[{ required: true }]}
                fieldProps={{
                  treeDefaultExpandAll: true,
                  treeData: [
                    {
                      value: '__root__',
                      title: t('rootDirectory', '根目录'),
                      children: treeData(parentOptions),
                    },
                  ],
                }}
              />
            </>
          );
        }}
      </ProFormDependency>
      <ProFormText
        name="name"
        label={t('menuName', '菜单名称')}
        rules={[{ required: true, whitespace: true }, { max: 100 }]}
      />
      <ProFormText
        name="i18nKey"
        label={t('menuI18nKey', '国际化键')}
        extra={t(
          'menuI18nKeyHelp',
          '填写语言包中的键，例如 menu.dashboard；留空显示菜单名称。',
        )}
        rules={[{ max: 150 }, { pattern: /^[a-zA-Z0-9_.-]*$/ }]}
      />
      <ProFormText
        name="icon"
        label={t('menuIcon', '图标编码')}
        fieldProps={{ maxLength: 64 }}
      />
      <ProFormDigit
        name="sortOrder"
        label={t('menuOrder', '排序')}
        min={0}
        max={10000}
        fieldProps={{ precision: 0 }}
        rules={[{ required: true }]}
      />
      <ProFormSwitch
        name="isActive"
        label={t('menuVisible', '显示入口')}
        disabled={menu?.isSystem}
      />
    </ModalForm>
  );
}
