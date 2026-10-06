import { Injectable, Logger } from '@nestjs/common';
import { AiProvider } from './ai-provider';

@Injectable()
export class OllamaProvider extends AiProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly baseUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434';
  private readonly model = process.env.OLLAMA_MODEL ?? 'llama3.2:3b';

  async complete(
    prompt: string,
    options: { json?: boolean; timeoutMs?: number } = {},
  ): Promise<string> {
    const controller = new AbortController();
    // first call can be slow while the model loads into RAM, so allow up to 60s
    const timer = setTimeout(
      () => controller.abort(),
      options.timeoutMs ?? 60_000,
    );

    try {
      const res = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false, // one JSON reply, not a token stream
          format: options.json ? 'json' : undefined, // forces valid JSON output
          options: { temperature: 0.2 }, // low = more predictable
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Ollama returned HTTP ${res.status}`);

      const data = (await res.json()) as { response: string };
      return data.response.trim();
    } catch (error: any) {
      this.logger.error(`Ollama call failed: ${error.message}`);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
