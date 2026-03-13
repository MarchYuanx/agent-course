import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ChatService, ChatMessage } from './chat.service';

@Controller('api')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('chat')
  async chat(
    @Body() body: { messages: ChatMessage[]; personaId?: string },
    @Res({ passthrough: false }) res: Response,
  ) {
    const { messages, personaId } = body ?? {};
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'messages is required and must be non-empty' });
      return;
    }

    try {
      const upstreamRes = await this.chatService.streamChat(messages, personaId);
      const stream = upstreamRes.body;
      if (!stream) {
        res.status(502).json({ error: 'No response body from API' });
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
      } finally {
        reader.releaseLock();
      }
      res.end();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      res.status(502).json({ error: msg });
    }
  }
}
