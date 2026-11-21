import {
  Badge,
  Button,
  Card,
  Input,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';

export interface MqttTestBrokerOption {
  key: string;
  label: string;
  brokerType: 'platform' | 'tenant';
  brokerId: string;
  tenantId: string;
  defaultProtocol: string;
}

interface LogEntry {
  id: number;
  direction: 'in' | 'out' | 'system';
  text: string;
  at: string;
}

interface Props {
  options: MqttTestBrokerOption[];
  scope: 'platform' | 'tenant';
}

const endpoint = () =>
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/ws`;

export default function MqttTestPanel({ options, scope }: Props) {
  const [optionKey, setOptionKey] = useState<string>();
  const [protocol, setProtocol] = useState('3.1.1');
  const [status, setStatus] = useState<'closed' | 'connecting' | 'open'>(
    'closed',
  );
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [topic, setTopic] = useState('tenants/example/test/#');
  const [qos, setQos] = useState(1);
  const [payload, setPayload] = useState('{"hello":"mqtt"}');
  const [retain, setRetain] = useState(false);
  const socket = useRef<WebSocket | null>(null);
  const pendingConnect = useRef<Record<string, unknown> | null>(null);
  const connectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const nextId = useRef(1);

  const selected = options.find((item) => item.key === optionKey);

  const append = (direction: LogEntry['direction'], text: string) => {
    setLogs((previous) => [
      ...previous.slice(-199),
      {
        id: nextId.current++,
        direction,
        text,
        at: new Date().toLocaleTimeString(),
      },
    ]);
  };

  const close = () => {
    const ws = socket.current;
    socket.current = null;
    pendingConnect.current = null;
    if (connectTimer.current) clearTimeout(connectTimer.current);
    setStatus('closed');
    if (!ws) return;
    // Detach first so a late close event cannot overwrite a newer connection.
    ws.onopen = null;
    ws.onmessage = null;
    ws.onerror = null;
    ws.onclose = null;
    ws.close(1000, 'client closed');
  };

  useEffect(() => () => close(), []);

  useEffect(() => {
    if (!selected) return;
    setProtocol(selected.defaultProtocol || '3.1.1');
  }, [selected]);

  const connect = () => {
    if (!selected) return;
    close();
    setStatus('connecting');
    append('system', `连接 ${selected.label}（${protocol}）`);
    pendingConnect.current = {
      brokerType: selected.brokerType,
      brokerId: selected.brokerId,
      tenantId: selected.tenantId,
      protocolVersion: protocol,
    };
    const ws = new WebSocket(endpoint());
    socket.current = ws;
    connectTimer.current = setTimeout(() => {
      if (socket.current !== ws) return;
      append('system', '连接超时：未收到 welcome 或 mqtt.connected');
      close();
    }, 10000);
    ws.onopen = () => {
      if (socket.current === ws) append('system', 'WebSocket 已连接，等待鉴权');
    };
    ws.onmessage = (event) => {
      if (socket.current !== ws) return;
      const raw = String(event.data);
      append('in', raw);
      try {
        const frame = JSON.parse(raw) as {
          type?: string;
          message?: string;
          sent?: boolean;
        };
        if (frame.type === 'welcome' && pendingConnect.current) {
          const payload = pendingConnect.current;
          pendingConnect.current = null;
          ws.send(JSON.stringify({ type: 'mqtt.connect', ...payload }));
        }
        if (frame.type === 'mqtt.connected') {
          if (connectTimer.current) clearTimeout(connectTimer.current);
          setStatus('open');
        }
        if (frame.type === 'mqtt.error') {
          if (connectTimer.current) clearTimeout(connectTimer.current);
          setStatus('closed');
          append('system', frame.message ?? 'MQTT 操作失败');
        }
        if (frame.type === 'mqtt.published' && frame.sent === false)
          append(
            'system',
            '消息已写入重试队列，但 Bridge 当前未连接，恢复后会自动重发',
          );
      } catch {
        // Keep raw payload in the log.
      }
    };
    ws.onerror = () => {
      if (socket.current === ws) append('system', 'WebSocket 连接错误');
    };
    ws.onclose = (event) => {
      if (socket.current !== ws) return;
      if (connectTimer.current) clearTimeout(connectTimer.current);
      setStatus('closed');
      socket.current = null;
      append('system', `WebSocket 已关闭 code=${event.code}`);
    };
  };

  const send = (frame: Record<string, unknown>) => {
    if (socket.current?.readyState !== WebSocket.OPEN) return;
    const raw = JSON.stringify(frame);
    socket.current.send(raw);
    append('out', raw);
  };

  const subscribe = () => {
    if (!topic.trim()) return;
    send({ type: 'mqtt.subscribe', topic: topic.trim(), qos });
  };

  const publish = () => {
    if (!topic.trim()) return;
    send({
      type: 'mqtt.publish',
      topic: topic.trim(),
      payload,
      qos,
      retain,
    });
  };

  const badge =
    status === 'open'
      ? ('success' as const)
      : status === 'connecting'
        ? ('processing' as const)
        : ('default' as const);

  return (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <Card title="连接">
        <Space wrap>
          <Select
            style={{ minWidth: 320 }}
            placeholder="选择 Broker"
            value={optionKey}
            onChange={(value) => {
              close();
              setOptionKey(value);
            }}
            options={options.map((item) => ({
              value: item.key,
              label: item.label,
            }))}
          />
          <Select
            style={{ width: 120 }}
            value={protocol}
            onChange={(value) => {
              if (status !== 'closed') close();
              setProtocol(value);
            }}
            options={[
              { value: '3.1.1', label: 'MQTT 3.1.1' },
              { value: '5', label: 'MQTT 5' },
            ]}
          />
          <Badge
            status={badge}
            text={
              status === 'open'
                ? '已连接'
                : status === 'connecting'
                  ? '连接中'
                  : '未连接'
            }
          />
          <Button type="primary" onClick={connect} disabled={!selected}>
            连接
          </Button>
          <Button onClick={close} disabled={status === 'closed'}>
            断开
          </Button>
          {scope === 'platform' && <Tag color="blue">平台测试</Tag>}
        </Space>
      </Card>

      <Card title="订阅与发布">
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Space wrap>
            <Input
              style={{ width: 420 }}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Topic / Topic Filter"
            />
            <Select
              style={{ width: 100 }}
              value={qos}
              onChange={setQos}
              options={[
                { value: 0, label: 'QoS 0' },
                { value: 1, label: 'QoS 1' },
                { value: 2, label: 'QoS 2' },
              ]}
            />
            <Button onClick={subscribe} disabled={status !== 'open'}>
              订阅
            </Button>
            <Button
              onClick={() =>
                send({ type: 'mqtt.unsubscribe', topic: topic.trim() })
              }
              disabled={status !== 'open'}
            >
              取消订阅
            </Button>
          </Space>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={payload}
              onChange={(event) => setPayload(event.target.value)}
              placeholder="Payload"
            />
            <Button onClick={publish} disabled={status !== 'open'}>
              发布
            </Button>
          </Space.Compact>
          <Space>
            <Typography.Text>Retain</Typography.Text>
            <Switch checked={retain} onChange={setRetain} />
            <Typography.Text type="secondary">
              平台 Broker 只允许发布到当前租户的 tenants/&lt;code&gt;/ 主题。
            </Typography.Text>
          </Space>
        </Space>
      </Card>

      <Card
        title="消息日志"
        extra={<Button onClick={() => setLogs([])}>清空</Button>}
      >
        <div
          style={{
            maxHeight: 420,
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: 12,
          }}
        >
          {logs.length === 0 ? (
            <Typography.Text type="secondary">暂无消息</Typography.Text>
          ) : (
            logs.map((entry) => (
              <div
                key={entry.id}
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  color:
                    entry.direction === 'in'
                      ? '#1677ff'
                      : entry.direction === 'out'
                        ? '#389e0d'
                        : '#8c8c8c',
                }}
              >
                [{entry.at}] {entry.direction.padEnd(6)} {entry.text}
              </div>
            ))
          )}
        </div>
      </Card>
    </Space>
  );
}
