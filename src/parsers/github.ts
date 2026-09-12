import type {
  GitHubEventType,
  GitHubPushPayload,
  GitHubPullRequestPayload,
  GitHubIssuesPayload,
  GitHubReleasePayload,
} from '../types/github.js';
import type { NotificationPayload, NotificationTheme } from '../types/notification.js';

const THEME: Record<string, NotificationTheme> = {
  success: 'success',
  danger: 'danger',
  warning: 'warning',
  info: 'info',
  neutral: 'neutral',
};

function shortSha(sha: string): string {
  return sha.slice(0, 7);
}

function branchFromRef(ref: string): string {
  return ref.replace(/^refs\/heads\//, '').replace(/^refs\/tags\//, '');
}

/**
 * Parse a verified GitHub webhook into zero or more NotificationPayloads.
 * Returns an empty array for events we intentionally ignore.
 */
export function parseGitHubEvent(
  eventType: GitHubEventType | string,
  payload: unknown,
  channelId: string
): NotificationPayload[] {
  switch (eventType) {
    case 'push':
      return parsePush(payload as GitHubPushPayload, channelId);
    case 'pull_request':
      return parsePullRequest(payload as GitHubPullRequestPayload, channelId);
    case 'issues':
      return parseIssues(payload as GitHubIssuesPayload, channelId);
    case 'release':
      return parseRelease(payload as GitHubReleasePayload, channelId);
    case 'ping':
      // GitHub sends this when you first configure the webhook
      return [];
    default:
      return [];
  }
}

function parsePush(p: GitHubPushPayload, channelId: string): NotificationPayload[] {
  const repo = p.repository.full_name;
  const branch = branchFromRef(p.ref);

  // Branch / tag deleted
  if (p.deleted) {
    return [
      {
        id: `push-delete-${p.after}-${Date.now()}`,
        channelId,
        repository: repo,
        title: `Branch deleted · \`${branch}\``,
        description: `Deleted by **${p.pusher.name}**`,
        theme: THEME.danger,
        author: {
          name: p.sender.login,
          iconURL: p.sender.avatar_url,
          url: p.sender.html_url,
        },
        url: p.repository.html_url,
        footer: repo,
        timestamp: new Date().toISOString(),
      },
    ];
  }

  // Force push or empty commit list (e.g. branch created with no new commits)
  if (!p.commits?.length) {
    const action = p.created ? 'created' : p.forced ? 'force-pushed' : 'updated';
    return [
      {
        id: `push-${action}-${p.after}-${Date.now()}`,
        channelId,
        repository: repo,
        title: `Branch ${action} · \`${branch}\``,
        description: `By **${p.pusher.name}**`,
        theme: p.forced ? THEME.warning : THEME.info,
        author: {
          name: p.sender.login,
          iconURL: p.sender.avatar_url,
          url: p.sender.html_url,
        },
        url: p.compare,
        footer: repo,
        timestamp: new Date().toISOString(),
      },
    ];
  }

  // Normal push with commits — one embed summarizing the push
  const commitLines = p.commits
    .slice(0, 8)
    .map((c) => {
      const msg = c.message.split('\n')[0].slice(0, 72);
      return `[\`${shortSha(c.id)}\`](${c.url}) ${msg}`;
    })
    .join('\n');

  const extra = p.commits.length > 8 ? `\n…and ${p.commits.length - 8} more` : '';

  return [
    {
      id: `push-${p.after}-${Date.now()}`,
      channelId,
      repository: repo,
      title: `${p.commits.length} commit${p.commits.length === 1 ? '' : 's'} → \`${branch}\``,
      description: commitLines + extra,
      theme: THEME.info,
      author: {
        name: p.sender.login,
        iconURL: p.sender.avatar_url,
        url: p.sender.html_url,
      },
      url: p.compare,
      fields: [
        {
          name: 'Compare',
          value: `[View diff](${p.compare})`,
          inline: true,
        },
      ],
      footer: repo,
      timestamp: p.head_commit?.timestamp ?? new Date().toISOString(),
    },
  ];
}

function parsePullRequest(
  p: GitHubPullRequestPayload,
  channelId: string
): NotificationPayload[] {
  const { action, pull_request: pr, repository, sender } = p;
  const repo = repository.full_name;

  // Only surface the high-signal actions
  if (!['opened', 'closed', 'reopened'].includes(action)) {
    return [];
  }

  let theme: NotificationTheme = THEME.info;
  let titlePrefix = 'Pull Request';

  if (action === 'opened' || action === 'reopened') {
    theme = THEME.info;
    titlePrefix = action === 'opened' ? 'PR opened' : 'PR reopened';
  } else if (action === 'closed') {
    if (pr.merged) {
      theme = THEME.success;
      titlePrefix = 'PR merged';
    } else {
      theme = THEME.danger;
      titlePrefix = 'PR closed';
    }
  }

  const fields = [
    { name: 'Branch', value: `\`${pr.head.ref}\` → \`${pr.base.ref}\``, inline: true },
    { name: 'Author', value: `[${pr.user.login}](${pr.user.html_url})`, inline: true },
  ];

  if (pr.merged && pr.merged_by) {
    fields.push({
      name: 'Merged by',
      value: `[${pr.merged_by.login}](${pr.merged_by.html_url})`,
      inline: true,
    });
  }

  return [
    {
      id: `pr-${pr.number}-${action}-${Date.now()}`,
      channelId,
      repository: repo,
      title: `${titlePrefix} #${pr.number}: ${pr.title}`,
      description: pr.body ? pr.body.slice(0, 400) + (pr.body.length > 400 ? '…' : '') : undefined,
      theme,
      author: {
        name: sender.login,
        iconURL: sender.avatar_url,
        url: sender.html_url,
      },
      url: pr.html_url,
      fields,
      footer: repo,
      timestamp: pr.updated_at,
    },
  ];
}

function parseIssues(p: GitHubIssuesPayload, channelId: string): NotificationPayload[] {
  const { action, issue, repository, sender } = p;
  const repo = repository.full_name;

  if (!['opened', 'closed', 'reopened'].includes(action)) {
    return [];
  }

  let theme: NotificationTheme = THEME.info;
  let titlePrefix = 'Issue';

  if (action === 'opened' || action === 'reopened') {
    theme = THEME.info;
    titlePrefix = action === 'opened' ? 'Issue opened' : 'Issue reopened';
  } else {
    theme = THEME.danger;
    titlePrefix = 'Issue closed';
  }

  return [
    {
      id: `issue-${issue.number}-${action}-${Date.now()}`,
      channelId,
      repository: repo,
      title: `${titlePrefix} #${issue.number}: ${issue.title}`,
      description: issue.body
        ? issue.body.slice(0, 400) + (issue.body.length > 400 ? '…' : '')
        : undefined,
      theme,
      author: {
        name: sender.login,
        iconURL: sender.avatar_url,
        url: sender.html_url,
      },
      url: issue.html_url,
      fields: [
        {
          name: 'Author',
          value: `[${issue.user.login}](${issue.user.html_url})`,
          inline: true,
        },
      ],
      footer: repo,
      timestamp: issue.updated_at,
    },
  ];
}

function parseRelease(
  p: GitHubReleasePayload,
  channelId: string
): NotificationPayload[] {
  const { action, release, repository, sender } = p;
  const repo = repository.full_name;

  // Only announce published releases
  if (action !== 'published') {
    return [];
  }

  return [
    {
      id: `release-${release.id}-${Date.now()}`,
      channelId,
      repository: repo,
      title: `Release published · ${release.name || release.tag_name}`,
      description: release.body
        ? release.body.slice(0, 500) + (release.body.length > 500 ? '…' : '')
        : undefined,
      theme: THEME.success,
      author: {
        name: sender.login,
        iconURL: sender.avatar_url,
        url: sender.html_url,
      },
      url: release.html_url,
      fields: [
        { name: 'Tag', value: `\`${release.tag_name}\``, inline: true },
        {
          name: 'Pre-release',
          value: release.prerelease ? 'Yes' : 'No',
          inline: true,
        },
      ],
      footer: repo,
      timestamp: release.published_at ?? release.created_at,
    },
  ];
}
