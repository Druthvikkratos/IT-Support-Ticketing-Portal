import { PrismaClient } from '@prisma/client';

export async function generateNextTicketNumber(tx: PrismaClient): Promise<string> {
     const updated = await tx.ticketCounter.update({
        where: {id: 1},
        data: {lastNumber: {increment: 1}}
     })
     const padded = String(updated.lastNumber).padStart(4, '0')
     return `INFO-${padded}`
}