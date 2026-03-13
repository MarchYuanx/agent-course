import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

  async streamChat(messages: ChatMessage[]): Promise<Response> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.modelName,
        messages,
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
