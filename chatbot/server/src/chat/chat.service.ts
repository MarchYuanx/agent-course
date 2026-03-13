import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildSystemPrompt } from './personas';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

@Injectable()
export class ChatService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly modelName: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('apiKey') ?? '';
    this.baseUrl = this.config.get<string>('baseUrl') ?? '';
    this.modelName = this.config.get<string>('modelName') ?? '';
  }

  async streamChat(messages: ChatMessage[], personaId?: string): Promise<Response> {
    const systemPrompt = buildSystemPrompt(personaId);
    const fullMessages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.filter((m) => m.role !== 'system'),
    ];

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: fullMessages,
        stream: true,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Model API error: ${res.status} ${err}`);
    }

    return res;
  }
}
