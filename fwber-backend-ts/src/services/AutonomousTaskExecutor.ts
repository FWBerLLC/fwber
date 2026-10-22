import { AutonomousService } from './AutonomousService.js';
import { AutonomousDecisionEngine, type ProposedAction } from './AutonomousDecisionEngine.js';

export class AutonomousTaskExecutor {
  /**
   * Best-effort audit logging.
   *
   * The ledger is observability, not business logic: if the write fails
   * (connection pool exhaustion, table locks, disk pressure) the wrapped
   * operation must still succeed. Previously a failed "Completed" logAction
   * fell into the catch block and RE-THREW — turning an already-successful
   * login into a 401. All ledger writes now go through this wrapper.
   */
  private static async logBestEffort(...args: Parameters<typeof AutonomousService.logAction>): Promise<void> {
    try {
      await AutonomousService.logAction(...args);
    } catch (err: any) {
      console.warn('[AutonomousTaskExecutor] audit log write failed (non-fatal):', err?.message);
    }
  }

  /**
   * Execute a task with autonomous oversight.
   * Evaluates the action against the Decision Engine, logs the start, execution, and result.
   *
   * @param opts.failOpen - when true, governance problems (decision engine
   *   unreachable, action delegated by policy) do NOT block the task; it runs
   *   anyway and the anomaly is recorded. Used for routine user-facing auth
   *   (login/register), which must never be gated by system-health state.
   */
  static async execute<T>(
    action: ProposedAction,
    task: () => Promise<T>,
    opts: { failOpen?: boolean } = {}
  ): Promise<T> {
    const failOpen = opts.failOpen === true;
    const startTime = performance.now();

    // Evaluate the action. With failOpen, a throwing decision engine degrades
    // to "Allow" instead of rejecting the user's request.
    let decision: 'Allow' | 'Deny' | 'Delegate' = 'Allow';
    let reason = 'fail-open default';
    try {
      ({ decision, reason } = await AutonomousDecisionEngine.evaluateAction(action));
    } catch (err: any) {
      if (!failOpen) throw err;
      reason = `Decision engine unavailable (fail-open): ${err?.message}`;
      console.warn('[AutonomousTaskExecutor]', reason);
    }

    if (decision === 'Deny') {
      await this.logBestEffort(action.type, 'Failed', {
        reason,
        status: 'Denied',
        impact: action.impact,
        module: action.module,
        decision_time_ms: performance.now() - startTime
      });
      throw new Error(`[AutonomousTaskExecutor] Action Denied: ${reason}`);
    }

    if (decision === 'Delegate') {
      if (failOpen) {
        // Record the delegation but proceed — routine auth is not gated by
        // the governance layer.
        await this.logBestEffort(action.type, 'Started', {
          reason,
          status: 'Delegated-but-proceeded',
          impact: action.impact,
          module: action.module,
          decision_time_ms: performance.now() - startTime
        });
      } else {
        await this.logBestEffort(action.type, 'Failed', {
          reason,
          status: 'Delegated',
          impact: action.impact,
          module: action.module,
          decision_time_ms: performance.now() - startTime
        });
        throw new Error(`[AutonomousTaskExecutor] Action Delegated: ${reason}`);
      }
    } else {
      // decision === 'Allow'
      await this.logBestEffort(action.type, 'Started', {
        impact: action.impact,
        module: action.module,
        decision_time_ms: performance.now() - startTime
      });
    }

    const executionStart = performance.now();
    try {
      const result = await task();
      const duration = performance.now() - executionStart;
      // NOTE: outside any failure path — a logging failure must never
      // discard an operation that already succeeded.
      await this.logBestEffort(action.type, 'Completed', {
        duration_ms: duration,
        total_time_ms: performance.now() - startTime
      });
      return result;
    } catch (error: any) {
      const duration = performance.now() - executionStart;
      await this.logBestEffort(action.type, 'Failed', {
        error: error.message,
        impact: action.impact,
        module: action.module,
        duration_ms: duration,
        total_time_ms: performance.now() - startTime
      });
      throw error;
    }
  }
}
