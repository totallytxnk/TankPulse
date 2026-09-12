import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';

/**
 * Verify GitHub X-Hub-Signature-256 header.
 * Must be called with the raw body (Buffer) — Fastify content-type parser is configured accordingly.
 */
export function verifyGitHubSignature(
  signatureHeader: string | undefined,
  rawBody: Buffer,
  secret: string = config.webhook.secret
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const received = signatureHeader.slice('sha256='.length);

  // timingSafeEqual requires equal-length Buffers
  try {
    const expectedBuf = Buffer.from(expected, 'hex');
    const receivedBuf = Buffer.from(received, 'hex');
    if (expectedBuf.length !== receivedBuf.length) return false;
    return timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}

/**
 * Fastify preHandler that rejects requests with invalid signatures.
 * Expects `request.rawBody` to be set by the custom content-type parser.
 */
export async function githubSignatureGuard(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const signature = request.headers['x-hub-signature-256'] as string | undefined;
  const rawBody = (request as FastifyRequest & { rawBody?: Buffer }).rawBody;

  if (!rawBody) {
    request.log.error('rawBody missing — content-type parser misconfigured');
    return reply.status(500).send({ error: 'Internal server error' });
  }

  if (!verifyGitHubSignature(signature, rawBody)) {
    request.log.warn(
      { ip: request.ip, signature: signature ? 'present' : 'missing' },
      'Invalid GitHub webhook signature'
    );
    return reply.status(401).send({ error: 'Invalid signature' });
  }
}
