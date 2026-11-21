import { PageContainer } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Badge, Button, Card, Input, Space, Tag, Typography } from 'antd';
import React, { useEffect, useRef, useState } from 'react';

type ConnectionStatus = 'closed' | 'connecting' | 'open';

interface LogEntry {
  id: number;
  direction: 'in' | 'out' | 'system';
  text: string;
  at: string;
}

interface WelcomeFrame {
  type: 'welcome';
  user: { id: string; name: string; isPlatformAdmin: boolean };
  tenant: { code: string; name: string } | null;
}

const statusMap: Record<
  ConnectionStatus,
  { status: 'default' | 'processing' | 'success'; label: string }
> = {
  closed: { status: 'default', label: '未连接' },
  connecting: { status: 'processing', label: '连接中' },
  open: { status: 'success', label: '已连接' },
};

export default function WebSocketTest() {
  const intl = useIntl();
  const [status, setStatus] = useState<ConnectionStatus>('closed');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [text, setText] = useState('hello from the browser');
  const [welcome, setWelcome] = useState<WelcomeFrame>();
  const socket = useRef<WebSocket | null>(null);
  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement | null>(null);

  const endpoint =
    typeof window === 'undefined'
      ? ''
      : `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/api/ws`;

  const append = (direction: LogEntry['direction'], textValue: string) => {
    setLogs((previous) => [
      ...previous.slice(-199),
      {
        id: nextId.current++,
        direction,
        text: textValue,
        at: new Date().toLocaleTimeString(),
      },
    ]);
  };

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [logs]);

  useEffect(
    () => () => {
      socket.current?.close(1000, 'page closed');
      socket.current = null;
    },
    [],
  );

  const connect = () => {
    if (socket.current) socket.current.close(1000, 'reconnect');
    setWelcome(undefined);
    setStatus('connecting');
    append('system', `连接 ${endpoint}`);
    const ws = new WebSocket(endpoint);
    socket.current = ws;
    ws.onopen = () => {
      setStatus('open');
      append('system', '连接已建立');
    };
    ws.onmessage = (event) => {
      const raw = String(event.data);
      append('in', raw);
      try {
        const frame = JSON.parse(raw) as { type?: string };
        if (frame.type === 'welcome') setWelcome(frame as WelcomeFrame);
      } catch {
        // Keep the raw payload visible in the log.
      }
    };
    ws.onerror = () => append('system', '连接发生错误');
    ws.onclose = (event) => {
      setStatus('closed');
      socket.current = null;
      append(
        'system',
        `连接已关闭 code=${event.code} reason=${event.reason || '-'}`,
      );
    };
  };

  const disconnect = () => {
    socket.current?.close(1000, 'client closed');
    socket.current = null;
    setStatus('closed');
  };

  const send = (payload: Record<string, unknown>) => {
    if (socket.current?.readyState !== WebSocket.OPEN) return;
    const raw = JSON.stringify(payload);
    socket.current.send(raw);
    append('out', raw);
  };

  const badge = statusMap[status];

  return (
    <PageContainer
      title={intl.formatMessage({
        id: 'pages.websocket.title',
        defaultMessage: 'WebSocket 测试',
      })}
      content={intl.formatMessage({
        id: 'pages.websocket.help',
        defaultMessage:
          '使用当前登录会话连接 /api/ws。浏览器自动携带 Cookie；其他工具可通过 Cookie 或 Authorization: Bearer <session> 鉴权。',
      })}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card>
          <Space wrap>
            <Badge status={badge.status} text={badge.label} />
            <Tag>{endpoint}</Tag>
            {welcome && (
              <>
                <Tag color="blue">{welcome.user.name}</Tag>
                <Tag color={welcome.tenant ? 'green' : 'geekblue'}>
                  {welcome.tenant
                    ? `${welcome.tenant.name} · ${welcome.tenant.code}`
                    : '平台端'}
                </Tag>
              </>
            )}
            <Button
              type="primary"
              onClick={connect}
              disabled={status !== 'closed'}
            >
              连接
            </Button>
            <Button onClick={disconnect} disabled={status === 'closed'}>
              断开
            </Button>
            <Button onClick={() => setLogs([])}>清空日志</Button>
          </Space>
        </Card>

        <Card title="发送消息">
          <Space.Compact style={{ width: '100%' }}>
            <Input
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="消息内容"
              onPressEnter={() => send({ type: 'echo', text })}
            />
            <Button onClick={() => send({ type: 'echo', text })}>
              发送 Echo
            </Button>
            <Button onClick={() => send({ type: 'broadcast', text })}>
              广播给同租户
            </Button>
            <Button onClick={() => send({ type: 'ping' })}>Ping</Button>
          </Space.Compact>
          <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
            支持 {`{ "type": "ping" }`}、{`{ "type": "echo", "text": "..." }`}、
            {` { "type": "broadcast", "text": "..." }`}。广播只在同一租户
            （平台端为同一平台范围）内可见。
          </Typography.Paragraph>
        </Card>

        <Card title="消息日志">
          <div
            ref={logRef}
            style={{
              maxHeight: 420,
              overflow: 'auto',
              fontFamily: 'monospace',
              fontSize: 12,
            }}
          >
            {logs.length === 0 ? (
              <Typography.Text type="secondary">
                暂无消息，点击“连接”开始。
              </Typography.Text>
            ) : (
              logs.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    color:
                      entry.direction === 'in'
                        ? '#1677ff'
                        : entry.direction === 'out'
                          ? '#389e0d'
                          : '#8c8c8c',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  [{entry.at}] {entry.direction.padEnd(6)} {entry.text}
                </div>
              ))
            )}
          </div>
        </Card>
      </Space>
    </PageContainer>
  );
}
