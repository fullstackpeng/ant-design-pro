import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormDigit,
  ProFormSwitch,
  ProFormText,
  ProFormTreeSelect,
  ProTable,
} from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import { Button, Popconfirm } from 'antd';
import React, { useRef, useState } from 'react';
import { departmentDescendants, departmentTree } from '@/utils/department-tree';
import { useManagement } from '../useManagement';
import {
  createDepartment,
  type Department,
  deleteDepartment,
  listDepartments,
  updateDepartment,
} from './service';

export default function Departments() {
  const { t, run, report, pending } = useManagement();
  const { initialState } = useModel('@@initialState');
  const permissions = initialState?.navigation?.permissions ?? [];
  const can = (operation: string) =>
    permissions.includes(`departments:${operation}`);
  const action = useRef<ActionType | null>(null);
  const [editing, setEditing] = useState<Department | null>();
  const [departments, setDepartments] = useState<Department[]>([]);
  const excluded = editing
    ? departmentDescendants(departments, editing.id)
    : new Set<string>();
  const reload = () => action.current?.reload();
  const columns: ProColumns<Department>[] = [
    { title: t('departmentName', '部门名称'), dataIndex: 'name' },
    { title: t('departmentCode', '部门编码'), dataIndex: 'code' },
    { title: t('sortOrder', '排序'), dataIndex: 'sortOrder', width: 100 },
    {
      title: t('status', '状态'),
      dataIndex: 'isActive',
      render: (_, row) =>
        row.isActive ? t('enabled', '启用') : t('disabled', '停用'),
    },
    {
      title: t('actions', '操作'),
      valueType: 'option',
      render: (_, row) => [
        can('update') && (
          <Button key="edit" type="link" onClick={() => setEditing(row)}>
            {t('edit', '编辑')}
          </Button>
        ),
        can('delete') && (
          <Popconfirm
            key="delete"
            title={t('deletedepartmentConfirm', '确认删除该部门？')}
            onConfirm={() => run(() => deleteDepartment(row.id), reload)}
            okButtonProps={{ loading: pending }}
          >
            <Button type="link" danger>
              {t('delete', '删除')}
            </Button>
          </Popconfirm>
        ),
      ],
    },
  ];
  return (
    <PageContainer title={t('departmentsManagement', '部门管理')}>
      <ProTable<Department>
        rowKey="id"
        actionRef={action}
        columns={columns}
        search={false}
        pagination={false}
        request={async () => {
          try {
            const result = await listDepartments();
            setDepartments(result.data);
            return {
              ...result,
              data: departmentTree(result.data),
              total: result.data.length,
            };
          } catch (error) {
            report(error);
            return { success: false, data: [], total: 0 };
          }
        }}
        toolBarRender={() => [
          can('create') && (
            <Button key="new" type="primary" onClick={() => setEditing(null)}>
              {t('createdepartment', '新增部门')}
            </Button>
          ),
        ]}
      />
      {editing !== undefined && (
        <ModalForm<BackendAPI.CreateDepartmentDto>
          title={
            editing
              ? t('editdepartment', '编辑部门')
              : t('createdepartment', '新增部门')
          }
          open
          onOpenChange={(open) => {
            if (!open) setEditing(undefined);
          }}
          initialValues={
            editing
              ? { ...editing, parentId: editing.parentId ?? undefined }
              : { sortOrder: 0, isActive: true }
          }
          onFinish={(values) =>
            run(
              () => {
                const body = { ...values, parentId: values.parentId ?? null };
                return editing
                  ? updateDepartment(editing.id, body)
                  : createDepartment(body);
              },
              () => {
                setEditing(undefined);
                reload();
              },
            )
          }
        >
          <ProFormText
            name="name"
            label={t('departmentName', '部门名称')}
            rules={[{ required: true, whitespace: true }, { max: 100 }]}
          />
          <ProFormText
            name="code"
            label={t('departmentCode', '部门编码')}
            rules={[{ required: true, whitespace: true }, { max: 64 }]}
          />
          <ProFormTreeSelect
            name="parentId"
            label={t('parentDepartment', '上级部门')}
            fieldProps={{
              allowClear: true,
              treeDefaultExpandAll: true,
              treeData: departmentTree(
                departments.map((row) => ({
                  ...row,
                  value: row.id,
                  title: row.name,
                  disabled: excluded.has(row.id),
                })),
              ),
            }}
          />
          <ProFormDigit
            name="sortOrder"
            label={t('sortOrder', '排序')}
            min={0}
            max={1000000}
            fieldProps={{ precision: 0 }}
            rules={[{ required: true }]}
          />
          <ProFormSwitch name="isActive" label={t('enabled', '启用')} />
        </ModalForm>
      )}
    </PageContainer>
  );
}
