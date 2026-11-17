import { ModalForm, ProFormCheckbox } from '@ant-design/pro-components';
import React, { useState } from 'react';
import {
  assignTenantFeatures,
  listFeatures,
  tenantFeatures,
} from '../navigation/service';
import { useManagement } from '../useManagement';
import type { Tenant } from './service';

export default function FeatureAssignment({
  tenant,
  onClose,
}: {
  tenant: Tenant;
  onClose: () => void;
}) {
  const { t, run, report } = useManagement();
  const [ready, setReady] = useState(false);
  const [options, setOptions] = useState<{ value: string; label: string }[]>(
    [],
  );
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
          setOptions(
            catalog.data.map((feature) => ({
              value: feature.code,
              label: feature.name,
            })),
          );
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
      <ProFormCheckbox.Group
        name="featureCodes"
        label={t('availableFeatures', '开通功能')}
        extra={t(
          'featuresHelp',
          '取消勾选会立即撤销对应接口权限。成员管理仅向租户管理员开放；首页和个人设置始终保留。',
        )}
        options={options}
      />
    </ModalForm>
  );
}
