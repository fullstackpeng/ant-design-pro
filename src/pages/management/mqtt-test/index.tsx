import { PageContainer } from '@ant-design/pro-components';
import React, { useEffect, useState } from 'react';
import MqttTestPanel, {
  type MqttTestBrokerOption,
} from '@/components/MqttTestPanel';
import {
  getPlatformBroker,
  listTenantBrokers,
  listTenantCredentials,
} from '../platform-mqtt/service';
import { useManagement } from '../useManagement';

export default function PlatformMqttTest() {
  const { t, report } = useManagement();
  const [options, setOptions] = useState<MqttTestBrokerOption[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [credentials, brokers, platform] = await Promise.all([
          listTenantCredentials(),
          listTenantBrokers(),
          getPlatformBroker(),
        ]);
        const protocol = platform.data?.defaultProtocol ?? '3.1.1';
        const platformOptions = credentials.data
          .filter((row) => row.status !== 'missing')
          .map((row) => ({
            key: `platform:${row.tenantId}`,
            label: `${row.tenantName} (${row.tenantCode}) · 平台 Broker`,
            brokerType: 'platform' as const,
            brokerId: '1',
            tenantId: row.tenantId,
            defaultProtocol: protocol,
          }));
        const tenantOptions = brokers.data.map((row) => ({
          key: `tenant:${row.id}`,
          label: `${row.tenantName ?? ''} (${row.tenantCode ?? ''}) · ${row.name}`,
          brokerType: 'tenant' as const,
          brokerId: row.id,
          tenantId: row.tenantId,
          defaultProtocol: row.protocolVersion,
        }));
        setOptions([...platformOptions, ...tenantOptions]);
      } catch (error) {
        report(error);
      }
    };
    void load();
  }, []);

  return (
    <PageContainer
      title={t('mqttTest', 'MQTT 测试')}
      content={t(
        'mqttTestHelp',
        '通过后端 WebSocket 连接平台或租户 Broker。平台 Broker 需要选择租户，并使用该租户的凭据。',
      )}
    >
      <MqttTestPanel options={options} scope="platform" />
    </PageContainer>
  );
}
