import { UploadOutlined } from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProForm,
  ProFormDependency,
  type ProFormInstance,
  ProFormSelect,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { getAllLocales, getLocale, useModel } from '@umijs/max';
import { Alert, App, Button, Upload } from 'antd';
import React, { useRef, useState } from 'react';
import {
  applySiteLocale,
  defaultSiteSettings,
  siteLayoutSettings,
} from '@/services/siteSettings';
import { useManagement } from '../useManagement';
import {
  getSiteSettings,
  listSiteSettingsHistory,
  type SettingsAudit,
  updateSiteSettings,
  uploadSiteAsset,
} from './service';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export default function Settings() {
  const { t, run, load, report, pending } = useManagement();
  const { message } = App.useApp();
  const { setInitialState } = useModel('@@initialState');
  const form = useRef<
    ProFormInstance<BackendAPI.PublicSiteSettingsDto> | undefined
  >(undefined);
  const history = useRef<ActionType | null>(null);
  const [revision, setRevision] = useState<number>();
  const [loadFailed, setLoadFailed] = useState(false);
  const fields = {
    title: t('siteTitle', '系统名称'),
    logo: t('siteLogo', 'Logo 地址'),
    loginBackground: t('loginBackground', '登录背景地址'),
    footerText: t('footerText', '页脚文字'),
    colorPrimary: t('primaryColor', '默认主题色'),
    defaultLocale: t('defaultLocale', '默认语言'),
  };
  const languageNames = new Intl.DisplayNames([getLocale()], {
    type: 'language',
  });
  const imageUpload = (field: 'logo' | 'loginBackground', label: string) => (
    <Upload
      showUploadList={false}
      maxCount={1}
      accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
      disabled={pending}
      beforeUpload={(file) => {
        if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
          message.error(
            t('imageOnly', '仅支持 PNG、JPEG、GIF、WebP 等位图格式'),
          );
          return Upload.LIST_IGNORE;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          message.error(t('imageTooLarge', '图片不能超过 10 MB'));
          return Upload.LIST_IGNORE;
        }
        return true;
      }}
      customRequest={({ file, onSuccess, onError }) => {
        run(
          async () => {
            const result = await uploadSiteAsset(file as File);
            form.current?.setFieldsValue(
              field === 'logo'
                ? { logo: result.data.url }
                : { loginBackground: result.data.url },
            );
          },
          () => undefined,
        ).then((ok) => {
          if (ok) onSuccess?.({});
          else onError?.(new Error('upload failed'));
        });
      }}
    >
      <Button icon={<UploadOutlined />}>{label}</Button>
    </Upload>
  );
  const columns: ProColumns<SettingsAudit>[] = [
    {
      title: t('changedAt', '修改时间'),
      dataIndex: 'createdAt',
      valueType: 'dateTime',
    },
    { title: t('changedBy', '修改人'), dataIndex: 'actorName' },
    {
      title: t('changes', '变更内容'),
      render: (_, row) => (
        <div>
          {(Object.keys(fields) as (keyof typeof fields)[])
            .filter((key) => row.before[key] !== row.after[key])
            .map((key) => (
              <div key={key} className="break-all">
                {fields[key]}：{row.before[key] || '—'} →{' '}
                {row.after[key] || '—'}
              </div>
            ))}
        </div>
      ),
    },
  ];
  return (
    <PageContainer title={t('systemSettings', '系统配置')}>
      <Alert
        className="mb-6"
        type={loadFailed ? 'error' : 'info'}
        showIcon
        title={
          loadFailed
            ? t('settingsLoadFailed', '配置读取失败，请刷新页面重试。')
            : t(
                'siteSettingsHelp',
                '保存后当前页面立即应用，其他会话刷新后生效。默认语言仅影响未自行选择语言的用户。图片留空可隐藏。',
              )
        }
      />
      <ProForm<BackendAPI.PublicSiteSettingsDto>
        formRef={form}
        request={async () => {
          try {
            const result = await getSiteSettings();
            setLoadFailed(false);
            setRevision(result.data.revision);
            return result.data;
          } catch (error) {
            setRevision(undefined);
            setLoadFailed(true);
            report(error);
            return defaultSiteSettings;
          }
        }}
        submitter={{
          resetButtonProps: false,
          submitButtonProps: {
            disabled: revision === undefined,
            loading: pending,
          },
        }}
        onFinish={async (values) => {
          if (revision === undefined) return false;
          return run(
            async () => {
              const { data } = await updateSiteSettings({
                ...values,
                revision,
              });
              setRevision(data.revision);
              form.current?.setFieldsValue(data);
              applySiteLocale(data.defaultLocale);
              await setInitialState((state) => ({
                ...state,
                siteSettings: data,
                settings: { ...state?.settings, ...siteLayoutSettings(data) },
              }));
            },
            () => {
              history.current?.reload();
            },
          );
        }}
      >
        <ProFormText
          name="title"
          label={fields.title}
          width="lg"
          rules={[{ required: true, whitespace: true }, { max: 100 }]}
        />
        <ProFormText
          name="logo"
          label={fields.logo}
          width="lg"
          rules={[{ max: 2048 }]}
        />
        <div className="mb-4">
          {imageUpload('logo', t('uploadLogo', '上传 Logo'))}
        </div>
        <ProFormDependency name={['logo']}>
          {({ logo }) =>
            logo ? (
              <img
                src={logo}
                alt=""
                style={{ maxHeight: 64, marginBottom: 24 }}
              />
            ) : null
          }
        </ProFormDependency>
        <ProFormText
          name="loginBackground"
          label={fields.loginBackground}
          width="lg"
          rules={[{ max: 2048 }]}
        />
        <div className="mb-4">
          {imageUpload(
            'loginBackground',
            t('uploadBackground', '上传登录背景'),
          )}
        </div>
        <ProFormDependency name={['loginBackground']}>
          {({ loginBackground }) =>
            loginBackground ? (
              <img
                src={loginBackground}
                alt=""
                style={{ maxHeight: 120, marginBottom: 24 }}
              />
            ) : null
          }
        </ProFormDependency>
        <ProFormText
          name="footerText"
          label={fields.footerText}
          width="lg"
          rules={[{ max: 200 }]}
        />
        <ProFormText
          name="colorPrimary"
          label={fields.colorPrimary}
          width="sm"
          fieldProps={{ type: 'color' }}
          rules={[{ required: true }, { pattern: /^#[0-9a-fA-F]{6}$/ }]}
        />
        <ProFormSelect
          name="defaultLocale"
          label={fields.defaultLocale}
          width="sm"
          options={getAllLocales().map((locale) => ({
            value: locale,
            label: languageNames.of(locale) ?? locale,
          }))}
          rules={[{ required: true }]}
        />
      </ProForm>
      <ProTable<SettingsAudit>
        className="mt-6"
        headerTitle={t('settingsHistory', '配置变更记录')}
        rowKey="id"
        actionRef={history}
        columns={columns}
        search={false}
        request={(params) => load(() => listSiteSettingsHistory(params))}
      />
    </PageContainer>
  );
}
