import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from 'src/modules/prisma/prisma/prisma.service';
import { AiProvider } from './ai-provider';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  constructor(
    private ai: AiProvider,
    private prisma: PrismaService,
  ) {}

  async suggestTicketFields(title: string, description: string) {
    const issueTypes = await this.prisma.issueType.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    const options = issueTypes.map((t) => `${t.id} = ${t.name}`).join('\n');
    const prompt = `You are an IT helpdesk triage assistant.
Pick the best issue type and a priority for the ticket below.

Issue types (id = name):
${options}

Priority rules: "high" if work is blocked, many people are affected, or security is involved. Otherwise "low".

Ticket title: ${title}
Ticket description: ${description}

Reply ONLY with JSON in exactly this shape:
{"issueTypeId": <number>, "priority": "low" or "high", "reason": "<one short sentence>"}`;

    let raw: string;
    try {
      raw = await this.ai.complete(prompt, { json: true });
    } catch (error) {
      throw new ServiceUnavailableException(
        'AI assistant is unavailable right now',
      );
    }
    try {
      const parsed = JSON.parse(raw);
      const issueTypeId = Number(parsed.issueTypeId);
      const validType = issueTypes.some((t) => t.id === issueTypeId);
      if (!validType || !['low', 'high'].includes(parsed.priority))
        throw new Error('unexpected shape');
      return {
        issueTypeId,
        priority: parsed.priority as 'low' | 'high',
        reason: String(parsed.reason ?? '').slice(0, 200),
      };
    } catch (error) {
      this.logger.warn(`AI returned unusable output: ${raw.slice(0, 200)}`);
      throw new ServiceUnavailableException(
        'AI could not produce a suggestion. Please choose manually.',
      );
    }
  }

  async summarizeTicketChat(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        ticketMessages: {
          orderBy: { createdAt: 'asc' },
          take: 60,
          include: { sender: { select: { name: true, role: true } } },
        },
      },
    });
    if (!ticket || ticket.isDeleted)
      throw new NotFoundException('Ticket not found');
    const lines = ticket.ticketMessages
      .filter((m) => m.message)
      .map(
        (m) =>
          `${m.sender.name} (${m.sender.role}): ${m.message!.slice(0, 500)}`,
      );
    if (lines.length === 0) return { summary: 'No messages yet.' };
    const prompt = `Summarize this IT support ticket conversation for an admin taking over.
Ticket: ${ticket.title}
Use exactly 3 short bullet points labelled "Problem", "Tried so far", "Current status". Do not invent details.

Conversation:
${lines.join('\n')}`;
    try {
      return { summary: await this.ai.complete(prompt) };
    } catch (error) {}
  }
}
