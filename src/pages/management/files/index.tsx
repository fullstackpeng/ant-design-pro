import { UploadOutlined } from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl, useModel } from '@umijs/max';
import { App, Button, Popconfirm, Progress, Upload } from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import { useManagement } from '../useManagement';
import {
  deleteFile,
  downloadFile,
  type FileItem,
  getFileUsage,
  listFiles,
  uploadFile,
} from './service';

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

export default function Files() {
  const { t, run, load, report } = useManagement();
  const intl = useIntl();
  const { message } = App.useApp();
  const { initialState } = useModel('@@initialState');
  const action = useRef<ActionType | null>(null);
  const [usage, setUsage] = useState<BackendAPI.FileUsageDto>();

  const permissions = initialState?.navigation?.permissions ?? [];
  const canUpload = permissions.includes('files:create');
  const canDelete = permissions.includes('files:delete');

  const refreshUsage = async () => {
    const result = await getFileUsage();
    setUsage(result.data);
  };
  useEffect(() => {
    refreshUsage().catch(report);
  }, []);

  const openDownload = async (row: FileItem) => {
    try {
      const result = await downloadFile(row.id);
      window.open(result.data.url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      report(error);
    }
  };

  const columns: ProColumns<FileItem>[] = [
    { title: t('fileName', '文件名'), dataIndex: 'keyword', hideInTable: true },
    {
      title: t('fileName', '文件名'),
      dataIndex: 'originalName',
      search: false,
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
        canDelete && (
          <Popconfirm
            key="delete"
            title={t('confirmDeleteFile', '确定删除该文件？')}
            onConfirm={() =>
              run(
                () => deleteFile(row.id),
                async () => {
                  action.current?.reload();
                  await refreshUsage();
                },
              )
            }
          >
            <Button type="link" danger>
              {t('delete', '删除')}
            </Button>
          </Popconfirm>
        ),
      ],
    },
  ];

  const maxFileSize = Number(usage?.maxFileSizeBytes ?? 0);
  const quota = Number(usage?.quotaBytes ?? 0);
  const used = Number(usage?.usedBytes ?? 0);
  const percent = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;

  return (
    <PageContainer
      title={t('files', '文件管理')}
      content={t(
        'filesHelp',
        '上传的文件保存在平台默认存储服务商中。下载链接为短时有效地址。',
      )}
      extra={
        usage ? (
          <div className="text-right">
            <div>
              {usage.planName
                ? `${formatBytes(usage.usedBytes)} / ${formatBytes(usage.quotaBytes)}`
                : t('noPlan', '未分配套餐，无法上传')}
            </div>
            <Progress
              percent={percent}
              showInfo={false}
              size="small"
              status={percent >= 100 ? 'exception' : 'normal'}
            />
            {usage.planName && (
              <div className="text-xs text-gray-500">
                {t('singleFileLimit', '单文件上限')}{' '}
                {formatBytes(usage.maxFileSizeBytes)}
              </div>
            )}
          </div>
        ) : undefined
      }
    >
      <ProTable<FileItem>
        rowKey="id"
        actionRef={action}
        columns={columns}
        request={(params) => load(() => listFiles(params))}
        toolBarRender={() =>
          canUpload && usage
            ? [
                <Upload
                  key="upload"
                  showUploadList={false}
                  maxCount={1}
                  disabled={maxFileSize === 0}
                  beforeUpload={(file) => {
                    if (maxFileSize > 0 && file.size > maxFileSize) {
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
                      () => uploadFile(file as File),
                      async () => {
                        action.current?.reload();
                        await refreshUsage();
                      },
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
              ]
            : []
        }
      />
    </PageContainer>
  );
}
