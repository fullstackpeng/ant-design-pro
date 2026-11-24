import { PageContainer } from '@ant-design/pro-components';
import { Bubble, Sender } from '@ant-design/x';
import { history, useIntl } from '@umijs/max';
import { Alert, App, Button, Card, Popconfirm, Select, Space } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ask,
  deleteConversation,
  listAssistants,
  listConversations,
  listMessages,
} from './service';
import { useStyles } from './style';

export default function ChatbotPage() {
  const { styles } = useStyles();
  const intl = useIntl();
  const { message } = App.useApp();
  const t = (id: string, defaultMessage: string) =>
    intl.formatMessage({ id: `ai.${id}`, defaultMessage });
  const [assistants, setAssistants] = useState<
    BackendAPI.AiAccessibleAssistantDto[]
  >([]);
  const [assistantId, setAssistantId] = useState<string>();
  const [conversations, setConversations] = useState<
    BackendAPI.AiConversationDto[]
  >([]);
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<BackendAPI.AiMessageDto[]>([]);
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const generation = useRef(0);
  const submitting = useRef(false);
  const report = useCallback(() => {
    message.error(
      intl.formatMessage({
        id: 'ai.failed',
        defaultMessage: '加载或提问失败，请刷新后重试',
      }),
    );
  }, [message, intl]);
  const refresh = useCallback(async () => {
    const result = await listConversations();
    setConversations(result.data);
    setTotal(result.total);
    setPage(1);
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all([listAssistants(), listConversations()])
      .then(([a, c]) => {
        if (!active) return;
        setAssistants(a.data);
        setAssistantId(a.data[0]?.id);
        setConversations(c.data);
        setTotal(c.total);
      })
      .catch(report)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      generation.current++;
    };
  }, [report]);

  const open = async (conversation: BackendAPI.AiConversationDto) => {
    if (submitting.current) return;
    const version = ++generation.current;
    setConversationId(conversation.id);
    setAssistantId(conversation.assistantId);
    setMessages([]);
    setLoading(true);
    try {
      const result = await listMessages(conversation.id);
      if (generation.current === version) setMessages(result);
    } catch {
      if (generation.current === version) report();
    } finally {
      if (generation.current === version) setLoading(false);
    }
  };
  const newChat = () => {
    if (submitting.current) return;
    generation.current++;
    setConversationId(undefined);
    setMessages([]);
    setLoading(false);
  };
  const send = async (content: string, documentId?: string) => {
    if (!assistantId || submitting.current || loading || !content.trim())
      return;
    submitting.current = true;
    setPending(true);
    const version = ++generation.current;
    try {
      const result = await ask({
        assistantId,
        conversationId,
        question: content,
        documentId,
      });
      if (generation.current !== version) return;
      setConversationId(result.data.conversationId);
      setQuestion('');
      setMessages(await listMessages(result.data.conversationId));
      await refresh();
    } catch {
      if (generation.current === version) {
        setMessages([]);
        report();
      }
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };

  return (
    <PageContainer title={t('title', '系统操作助手')}>
      <Card variant="borderless">
        <Space orientation="vertical" style={{ width: '100%' }}>
          <Alert
            type="info"
            title={t(
              'help',
              '根据您可访问的操作指南回答，并提供来源；不会执行业务操作。',
            )}
          />
          {!loading && !assistants.length && (
            <Alert
              type="warning"
              title={t(
                'unavailable',
                '暂无可访问助手，请联系平台管理员发布知识与助手。',
              )}
            />
          )}
          <Space wrap>
            <Select
              aria-label={t('assistant', '选择助手')}
              style={{ minWidth: 200 }}
              value={assistantId}
              disabled={pending || loading || !!conversationId}
              options={assistants.map((a) => ({ value: a.id, label: a.name }))}
              onChange={setAssistantId}
            />
            <Button onClick={newChat} disabled={pending}>
              {t('new', '新对话')}
            </Button>
            <Button
              disabled={pending || loading}
              onClick={() => {
                if (conversationId) {
                  const row = conversations.find(
                    (c) => c.id === conversationId,
                  );
                  if (row) void open(row);
                }
                void refresh().catch(report);
              }}
            >
              {t('refresh', '刷新')}
            </Button>
          </Space>
          <div className={styles.layout} style={{ minHeight: 480 }}>
            <aside className={styles.sidebar} style={{ padding: 12, gap: 8 }}>
              {conversations.map((c) => (
                <Space key={c.id}>
                  <Button
                    type={c.id === conversationId ? 'primary' : 'text'}
                    disabled={pending}
                    onClick={() => void open(c)}
                  >{`${c.title} #${c.id}`}</Button>
                  <Popconfirm
                    title={t('deleteConfirm', '删除此会话及全部消息？')}
                    onConfirm={async () => {
                      try {
                        await deleteConversation(c.id);
                        if (conversationId === c.id) newChat();
                        await refresh();
                      } catch {
                        report();
                      }
                    }}
                  >
                    <Button size="small" danger disabled={pending}>
                      {t('delete', '删除')}
                    </Button>
                  </Popconfirm>
                </Space>
              ))}
              {conversations.length < total && (
                <Button
                  onClick={async () => {
                    try {
                      const result = await listConversations(page + 1);
                      setConversations((prev) => [...prev, ...result.data]);
                      setPage(page + 1);
                    } catch {
                      report();
                    }
                  }}
                >
                  {t('more', '加载更多')}
                </Button>
              )}
            </aside>
            <div className={styles.main}>
              <div className={styles.messages} aria-busy={loading}>
                <Bubble.List
                  items={messages.map((m) => ({
                    key: m.id,
                    role: m.role === 'user' ? 'user' : 'ai',
                    content: m.content,
                    footer:
                      m.role === 'assistant' && m.sources.length ? (
                        <Space wrap>
                          {m.sources.map((source) => (
                            <Space key={source.chunkId}>
                              <Button
                                size="small"
                                disabled={pending}
                                onClick={() => {
                                  void send(source.title, source.documentId);
                                }}
                              >
                                {source.title}
                              </Button>
                              {source.route && (
                                <Button
                                  size="small"
                                  type="link"
                                  onClick={() =>
                                    history.push(source.route ?? '/chatbot')
                                  }
                                >
                                  {t('navigate', '前往页面')}
                                </Button>
                              )}
                            </Space>
                          ))}
                        </Space>
                      ) : undefined,
                  }))}
                  role={{
                    user: { placement: 'end' },
                    ai: { placement: 'start' },
                  }}
                />
              </div>
              <div className={styles.footer}>
                <Sender
                  value={question}
                  onChange={(value) => setQuestion(value.slice(0, 1000))}
                  onSubmit={(content) => void send(content)}
                  loading={pending}
                  disabled={!assistantId || loading}
                  placeholder={t('placeholder', '例如：如何新增成员？')}
                />
              </div>
            </div>
          </div>
        </Space>
      </Card>
    </PageContainer>
  );
}
