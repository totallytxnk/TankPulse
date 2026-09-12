/** Minimal typed shapes for the GitHub webhook payloads we care about */

export type GitHubEventType =
  | 'push'
  | 'pull_request'
  | 'issues'
  | 'release'
  | 'ping';

export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  owner: GitHubUser;
}

export interface GitHubCommit {
  id: string;
  message: string;
  timestamp: string;
  url: string;
  author: {
    name: string;
    email: string;
    username?: string;
  };
  committer: {
    name: string;
    email: string;
    username?: string;
  };
  added: string[];
  removed: string[];
  modified: string[];
}

export interface GitHubPushPayload {
  ref: string;
  before: string;
  after: string;
  created: boolean;
  deleted: boolean;
  forced: boolean;
  compare: string;
  commits: GitHubCommit[];
  head_commit: GitHubCommit | null;
  repository: GitHubRepo;
  pusher: { name: string; email: string };
  sender: GitHubUser;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  user: GitHubUser;
  merged: boolean;
  merged_at: string | null;
  merged_by: GitHubUser | null;
  head: { ref: string; sha: string };
  base: { ref: string; sha: string };
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface GitHubPullRequestPayload {
  action: 'opened' | 'closed' | 'reopened' | 'synchronize' | 'edited' | string;
  number: number;
  pull_request: GitHubPullRequest;
  repository: GitHubRepo;
  sender: GitHubUser;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface GitHubIssuesPayload {
  action: 'opened' | 'closed' | 'reopened' | 'edited' | string;
  issue: GitHubIssue;
  repository: GitHubRepo;
  sender: GitHubUser;
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  html_url: string;
  author: GitHubUser;
  published_at: string | null;
  created_at: string;
}

export interface GitHubReleasePayload {
  action: 'published' | 'created' | 'edited' | 'deleted' | 'prereleased' | 'released' | string;
  release: GitHubRelease;
  repository: GitHubRepo;
  sender: GitHubUser;
}

export type GitHubWebhookPayload =
  | GitHubPushPayload
  | GitHubPullRequestPayload
  | GitHubIssuesPayload
  | GitHubReleasePayload
  | Record<string, unknown>;
