export interface LlmRequest {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  signal: AbortSignal;
  maxTokens: number;
}
export interface LlmResponse {
  content: string;
  usage: { inputTokens: number; outputTokens: number } | null;
}
export interface LlmProvider {
  chat(request: LlmRequest): Promise<LlmResponse>;
  stream(
    request: LlmRequest,
  ): AsyncIterable<
    | { type: 'delta'; text: string }
    | { type: 'done'; usage: LlmResponse['usage'] }
  >;
}
