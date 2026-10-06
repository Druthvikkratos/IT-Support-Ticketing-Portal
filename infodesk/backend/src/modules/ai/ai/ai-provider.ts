export abstract class AiProvider {
  abstract complete(
    prompt: string,
    options?: { json?: boolean; timeoutMs?: number },
  ): Promise<string>;
}
