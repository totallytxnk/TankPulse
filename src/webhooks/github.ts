import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { githubSignatureGuard } from './verify.js';
import { parseGitHubEvent } from '../parsers/github.js';
import { enqueueNotifications } from '../queue/index.js';
import { getChannelsForRepo } from '../utils/channel-store.js';
import type { GitHubEventType } from '../types/github.js';

interface GitHubRequestBody {
  repository?: { full_name?: string };
  [key: string]: unknown;
}

export async function githubWebhookRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    '/api/webhooks/github',
    {
      preHandler: githubSignatureGuard,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const eventType = (request.headers['x-github-event'] as string) || 'unknown';
      const deliveryId = request.headers['x-github-delivery'] as string | undefined;
      const body = request.body as GitHubRequestBody;

      request.log.info(
        { eventType, deliveryId, repo: body.repository?.full_name },
        'Received GitHub webhook'
      );

      // Ping events are just connectivity checks
      if (eventType === 'ping') {
        return reply.status(200).send({ ok: true, message: 'pong' });
      }

      const repoFullName = body.repository?.full_name;
      if (!repoFullName) {
        request.log.warn('Payload missing repository.full_name');
        return reply.status(200).send({ ok: true, message: 'ignored — no repository' });
      }

      const channelIds = await getChannelsForRepo(repoFullName);
      if (channelIds.length === 0) {
        request.log.info({ repo: repoFullName }, 'No channels configured for repository');
        return reply.status(200).send({ ok: true, message: 'no subscribers' });
      }

      const allPayloads = [];
      for (const channelId of channelIds) {
        const notifications = parseGitHubEvent(
          eventType as GitHubEventType,
          body,
          channelId
        );
        allPayloads.push(...notifications);
      }

      if (allPayloads.length > 0) {
        await enqueueNotifications(allPayloads);
        request.log.info(
          { count: allPayloads.length, channels: channelIds.length },
          'Enqueued notifications'
        );
      }

      // Always 200 so GitHub does not retry on "no-op" events
      return reply.status(200).send({
        ok: true,
        enqueued: allPayloads.length,
      });
    }
  );
}
