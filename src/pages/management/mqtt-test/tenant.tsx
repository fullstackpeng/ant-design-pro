import { PageContainer } from '@ant-design/pro-components';
import React, { useEffect, useState } from 'react';
import MqttTestPanel, {
  type MqttTestBrokerOption,
} from '@/components/MqttTestPanel';
import { getCredentialMetadata, listBrokers } from '../tenant-mqtt/service';
import { useManagement } from '../useManagement';

export default function TenantMqttTest() {
  const { t, report } = useManagement();
  const [options, setOptions] = useState<MqttTestBrokerOption[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [metadata, brokers] = await Promise.all([
          getCredentialMetadata(),
          listBrokers(),
        ]);
        const list: MqttTestBrokerOption[] = [];
        if (metadata.data && metadata.data.status !== 'missing')
          list.push({
            key: 'platform',
            label: '平台 Broker',
            brokerType: 'platform',
            brokerId: '1',
            tenantId: metadata.data.tenantId,
            defaultProtocol: metadata.data.platform.protocols[0] ?? '3.1.1',
          });
        for (const broker of brokers.data)
          list.push({
            key: `tenant:${broker.id}`,
            label: `自有 Broker · ${broker.name}`,
            brokerType: 'tenant',
            brokerId: broker.id,
            tenantId: broker.tenantId,
            defaultProtocol: broker.protocolVersion,
          });
        setOptions(list);
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
        'tenantMqttTestHelp',
        '使用本租户的平台 Broker 凭据或自有 Broker 测试连接、订阅和发布。',
      )}
    >
      <MqttTestPanel options={options} scope="tenant" />
    </PageContainer>
  );
}
