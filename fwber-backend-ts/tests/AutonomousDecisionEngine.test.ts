import { jest } from '@jest/globals';

const mockIsAdjustmentEnabled = jest.fn();
const mockVerifyProtocol = jest.fn();

jest.unstable_mockModule('../src/services/AutonomousService.js', () => ({
  AutonomousService: { isAdjustmentEnabled: mockIsAdjustmentEnabled }
}));

jest.unstable_mockModule('../src/services/ProtocolVerificationService.js', () => ({
  ProtocolVerificationService: { verifyProtocol: mockVerifyProtocol }
}));

const { AutonomousDecisionEngine } = await import('../src/services/AutonomousDecisionEngine.js');

describe('AutonomousDecisionEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should deny medium impact action if health score is low', async () => {
    mockIsAdjustmentEnabled.mockResolvedValue(false);
    mockVerifyProtocol.mockResolvedValue({ score: 40, passed: false });

    const result = await AutonomousDecisionEngine.evaluateAction({
      type: 'Code Refactor',
      impact: 'medium',
      module: 'Core'
    });

    expect(result.decision).toBe('Deny');
    expect(result.reason).toContain('integrity too low');
  });

  it('should delegate high impact action in strict mode', async () => {
    mockIsAdjustmentEnabled.mockResolvedValue(true);
    mockVerifyProtocol.mockResolvedValue({ score: 90, passed: true });

    const result = await AutonomousDecisionEngine.evaluateAction({
      type: 'Schema Change',
      impact: 'high',
      module: 'DB'
    });

    expect(result.decision).toBe('Delegate');
    expect(result.reason).toContain('Strict mode enabled');
  });

  it('should allow low impact action when healthy', async () => {
    mockIsAdjustmentEnabled.mockResolvedValue(false);
    mockVerifyProtocol.mockResolvedValue({ score: 95, passed: true });

    const result = await AutonomousDecisionEngine.evaluateAction({
      type: 'Doc Update',
      impact: 'low',
      module: 'Docs'
    });

    expect(result.decision).toBe('Allow');
  });

  // --- Regression tests for the transient-login-401 root cause (v2.3.39) ---

  it('should allow low impact action despite degraded health (was: Delegate)', async () => {
    // Score 60 = passed:false. Before the fix this returned 'Delegate', the
    // executor threw, and the auth controller turned it into a 401 — rejecting
    // valid logins whenever 3+ admin tasks were dangling.
    mockIsAdjustmentEnabled.mockResolvedValue(false);
    mockVerifyProtocol.mockResolvedValue({ score: 60, passed: false });

    const result = await AutonomousDecisionEngine.evaluateAction({
      type: 'User Login',
      impact: 'low',
      module: 'Auth'
    });

    expect(result.decision).toBe('Allow');
    expect(result.reason).toContain('degraded system health');
  });

  it('should allow low impact action when the health audit itself throws', async () => {
    mockIsAdjustmentEnabled.mockResolvedValue(false);
    mockVerifyProtocol.mockRejectedValue(new Error('db unreachable'));

    const result = await AutonomousDecisionEngine.evaluateAction({
      type: 'User Login',
      impact: 'low',
      module: 'Auth'
    });

    expect(result.decision).toBe('Allow');
  });

  it('should still delegate medium impact action when health is degraded', async () => {
    // Governance must survive where oversight matters.
    mockIsAdjustmentEnabled.mockResolvedValue(false);
    mockVerifyProtocol.mockResolvedValue({ score: 60, passed: false });

    const result = await AutonomousDecisionEngine.evaluateAction({
      type: 'Bulk Outreach',
      impact: 'medium',
      module: 'Marketing'
    });

    expect(result.decision).toBe('Delegate');
  });
});
