/**
 * Paperclip adapter-core types — defined inline so the adapter
 * is self-contained without requiring @paperclipai/adapter-core.
 */

export interface AdapterExecutionContext {
  runId: string;
  taskId?: string;
  agent: {
    id: string;
    name: string;
    [key: string]: unknown;
  };
  runtime: {
    sessionId?: string | null;
    sessionParams?: Record<string, unknown> | null;
    [key: string]: unknown;
  };
  /** Agent config values from Paperclip UI */
  config: Record<string, unknown>;
  /** Task input data — contains the video brief */
  context: Record<string, unknown>;
  /** Streaming log callback */
  onLog: (stream: 'stdout' | 'stderr', chunk: string) => Promise<void>;
  onSpawn?: (meta: { pid: number; startedAt: string }) => Promise<void>;
  authToken?: string;
}

export interface AdapterExecutionResult {
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  errorMessage?: string | null;
  errorCode?: string | null;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
  sessionId?: string | null;
  sessionParams?: Record<string, unknown> | null;
  provider?: string | null;
  biller?: string | null;
  model?: string | null;
  billingType?: string | null;
  costUsd?: number | null;
  resultJson?: Record<string, unknown> | null;
  summary?: string | null;
}

/** Safe config accessors */
export function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (value == null) return fallback;
  return String(value);
}

export function asNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}

export function asBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}
