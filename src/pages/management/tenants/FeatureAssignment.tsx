import { ModalForm, ProForm } from '@ant-design/pro-components';
import { Alert, Card, Checkbox, Space, Tag, Typography } from 'antd';
import React, { useState } from 'react';
import {
  assignTenantFeatures,
  listFeatures,
  tenantFeatures,
} from '../navigation/service';
import { useManagement } from '../useManagement';
import type { Tenant } from './service';

interface FeaturePickerProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  features: BackendAPI.FeatureDto[];
}

function FeaturePicker({ value = [], onChange, features }: FeaturePickerProps) {
  const toggle = (code: string, checked: boolean) => {
    const next = checked
      ? [...new Set([...value, code])]
      : value.filter((item) => item !== code);
    onChange?.(next);
  };
  const categories = [
    {
      key: 'base',
      title: '基础功能',
      description: '正式业务模块，建议按租户实际需要开通。',
    },
    {
      key: 'samples',
      title: '示例功能',
      description: '模板演示页面，正式客户通常不需要开通。',
    },
  ];
  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      {categories.map((category) => {
        const items = features.filter(
          (feature) => feature.category === category.key,
        );
        if (items.length === 0) return null;
        const selected = items.filter((item) => value.includes(item.code));
        return (
          <Card
            key={category.key}
            size="small"
            title={category.title}
            extra={
              <Checkbox
                checked={selected.length === items.length}
                indeterminate={
                  selected.length > 0 && selected.length < items.length
                }
                onChange={(event) => {
                  const rest = value.filter(
                    (code) => !items.some((item) => item.code === code),
                  );
                  onChange?.(
                    event.target.checked
                      ? [...rest, ...items.map((item) => item.code)]
                      : rest,
                  );
                }}
              >
                全选
              </Checkbox>
            }
          >
            <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
              {category.description}
            </Typography.Paragraph>
            <Space
              orientation="vertical"
              size="small"
              style={{ width: '100%' }}
            >
              {items.map((feature) => (
                <Checkbox
                  key={feature.code}
                  checked={value.includes(feature.code)}
                  onChange={(event) =>
                    toggle(feature.code, event.target.checked)
                  }
                >
                  <Space wrap>
                    <span>{feature.name}</span>
                    <Tag>{feature.code}</Tag>
                    {feature.defaultGranted && (
                      <Tag color="green">默认开通</Tag>
                    )}
                    {feature.isDemo && <Tag color="orange">演示</Tag>}
                  </Space>
                  <div>
                    <Typography.Text type="secondary">
                      {feature.description || '暂无说明'}
                    </Typography.Text>
                  </div>
                </Checkbox>
              ))}
            </Space>
          </Card>
        );
      })}
    </Space>
  );
}

export default function FeatureAssignment({
  tenant,
  onClose,
}: {
  tenant: Tenant;
  onClose: () => void;
}) {
  const { t, run, report } = useManagement();
  const [ready, setReady] = useState(false);
  const [features, setFeatures] = useState<BackendAPI.FeatureDto[]>([]);
  return (
    <ModalForm<{ featureCodes: string[] }>
      open
      title={`${t('assignFeatures', '分配功能')} · ${tenant.name}`}
      submitter={{ submitButtonProps: { disabled: !ready } }}
      request={async () => {
        try {
          const [assigned, catalog] = await Promise.all([
            tenantFeatures(tenant.id),
            listFeatures(),
          ]);
          setFeatures(catalog.data);
          setReady(true);
          return { featureCodes: assigned.data };
        } catch (error) {
          report(error);
          return { featureCodes: [] };
        }
      }}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      onFinish={(values) =>
        run(
          () => assignTenantFeatures(tenant.id, values.featureCodes ?? []),
          onClose,
        )
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        title={t(
          'featuresHelp',
          '取消勾选会立即撤销对应接口权限。示例模块默认不开通；成员管理仅向租户管理员开放。',
        )}
      />
      <ProForm.Item
        name="featureCodes"
        label={t('availableFeatures', '开通功能')}
      >
        <FeaturePicker features={features} />
      </ProForm.Item>
    </ModalForm>
  );
}
