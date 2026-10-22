import { AutonomousService } from './AutonomousService.js';
import { ProtocolVerificationService } from './ProtocolVerificationService.js';

export type Decision = 'Allow' | 'Deny' | 'Delegate';

export interface ProposedAction {
  type: string;
  impact: 'low' | 'medium' | 'high';
  module: string;
}

export class AutonomousDecisionEngine {
  /**
   * Decide whether to allow an autonomous action based on protocol settings and system health.
   */
  static async evaluateAction(action: ProposedAction): Promise<{ decision: Decision; reason: string }> {
    // 1. Check if Strict Mode is enabled
    const isStrict = await AutonomousService.isAdjustmentEnabled('strict_mode');

    // 2. Perform a quick health audit.
    //    The audit itself can throw (DB hiccups, missing tables on fresh
    //    installs). A broken audit must NOT hard-fail routine user actions, so
    //    we degrade gracefully to a zero-score result and let the low-impact
    //    policy below decide.
    let verification: { passed: boolean; score: number };
    try {
      verification = await ProtocolVerificationService.verifyProtocol();
    } catch (err: any) {
      verification = { passed: false, score: 0 };
      console.warn('[AutonomousDecisionEngine] health audit failed (degrading):', err?.message);
    }

    // Logic:
    // - If system score is < 50, Deny all high/medium impact actions.
    // - If strict_mode is ON, Delegate high impact actions.
    // - If system is "passed" (score > 70), Allow low/medium.
    // - LOW-impact actions are always Allowed (see note below).

    if (verification.score < 50) {
      if (action.impact !== 'low') {
        return { decision: 'Deny', reason: `System integrity too low (${verification.score}/100) for ${action.impact} impact action.` };
      }
    }

    if (isStrict) {
      if (action.impact === 'high') {
        return { decision: 'Delegate', reason: 'Strict mode enabled. High impact actions require delegation.' };
      }
    }

    if (verification.passed) {
      return { decision: 'Allow', reason: 'System health verified. Action within safety parameters.' };
    }

    // Degraded health (score <= 70): low-impact routine actions — user login,
    // registration, profile reads — must still proceed. Routing a login to
    // "human oversight" because three admin tasks are dangling (score formula:
    // 100 - danglingTasks*5 - flappingSettings*10) rejects valid users with a
    // misleading 401 and was the root cause of the transient login failures
    // observed 2026-10-16..22. Delegation stays reserved for medium/high
    // impact actions where oversight actually matters.
    if (action.impact === 'low') {
      return { decision: 'Allow', reason: `Low-impact action allowed despite degraded system health (${verification.score}/100).` };
    }

    // Default to delegation if uncertain
    return { decision: 'Delegate', reason: 'Action outside automated allowance thresholds. Requesting human/subagent oversight.' };
  }
}
