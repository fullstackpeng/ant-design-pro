import { UploadOutlined } from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { App, Button, Popconfirm, Tag, Upload } from 'antd';
import React, { useRef } from 'react';
import { useManagement } from '../useManagement';
import {
  deletePlatformFile,
  downloadPlatformFile,
  listPlatformFiles,
  type PlatformFile,
  uploadPlatformFile,
} from './service';

const MAX_UPLOAD_BYTES = 512 * 1024 * 1024;

function formatBytes(value: string) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return '-';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function PlatformFiles() {
  const { t, run, load, report } = useManagement();
  const intl = useIntl();
  const { message } = App.useApp();
  const action = useRef<ActionType | null>(null);

  const openDownload = async (row: PlatformFile) => {
    try {
      const result = await downloadPlatformFile(row.id);
      window.open(result.data.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      report(error);
    }
  };

  const columns: ProColumns<PlatformFile>[] = [
    { title: t('fileName', '文件名'), dataIndex: 'keyword', hideInTable: true },
    {
      title: t('tenant', '租户'),
      dataIndex: 'tenant',
      hideInTable: true,
      fieldProps: { placeholder: t('tenantSearch', '租户编码或名称') },
    },
    {
      title: t('fileName', '文件名'),
      dataIndex: 'originalName',
      search: false,
    },
    {
      title: t('tenant', '租户'),
      search: false,
      render: (_, row) =>
        row.tenantName ? (
          <Tag>
            {row.tenantName} · {row.tenantCode}
          </Tag>
        ) : (
          <Tag color="blue">{t('platform', '平台')}</Tag>
        ),
    },
    {
      title: t('size', '大小'),
      dataIndex: 'size',
      search: false,
      render: (_, row) => formatBytes(row.size),
    },
    {
      title: t('provider', '存储服务商'),
      dataIndex: 'providerName',
      search: false,
    },
    {
      title: t('uploadedBy', '上传人'),
      dataIndex: 'uploadedByName',
      search: false,
    },
    {
      title: t('uploadedAt', '上传时间'),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
      search: false,
    },
    {
      title: t('actions', '操作'),
      valueType: 'option',
      render: (_, row) => [
        <Button key="download" type="link" onClick={() => openDownload(row)}>
          {t('download', '下载')}
        </Button>,
        <Popconfirm
          key="delete"
          title={t('confirmDeleteFile', '确定删除该文件？')}
          onConfirm={() =>
            run(
              () => deletePlatformFile(row.id),
              () => action.current?.reload(),
            )
          }
        >
          <Button type="link" danger>
            {t('delete', '删除')}
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer
      title={t('platformFiles', '文件管理')}
      content={t(
        'platformFilesHelp',
        '查看全部租户及平台文件，可按文件名或租户搜索；平台上传的文件不属于任何租户。',
      )}
    >
      <ProTable<PlatformFile>
        rowKey="id"
        actionRef={action}
        columns={columns}
        request={(params) => load(() => listPlatformFiles(params))}
        toolBarRender={() => [
          <Upload
            key="upload"
            showUploadList={false}
            maxCount={1}
            beforeUpload={(file) => {
              if (file.size > MAX_UPLOAD_BYTES) {
                message.error(
                  intl.formatMessage({
                    id: 'management.fileTooLarge',
                    defaultMessage: '文件超过允许的大小上限',
                  }),
                );
                return Upload.LIST_IGNORE;
              }
              return true;
            }}
            customRequest={({ file, onSuccess, onError }) => {
              run(
                () => uploadPlatformFile(file as File),
                () => action.current?.reload(),
              ).then((ok) => {
                if (ok) onSuccess?.({});
                else onError?.(new Error('upload failed'));
              });
            }}
          >
            <Button type="primary" icon={<UploadOutlined />}>
              {t('upload', '上传文件')}
            </Button>
          </Upload>,
        ]}
      />
    </PageContainer>
  );
}
