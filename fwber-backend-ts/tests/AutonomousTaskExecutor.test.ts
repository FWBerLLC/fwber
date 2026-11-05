import { jest } from '@jest/globals';

const mockEvaluateAction = jest.fn();
const mockLogAction = jest.fn();

jest.unstable_mockModule('../src/services/AutonomousDecisionEngine.js', () => ({
  AutonomousDecisionEngine: { evaluateAction: mockEvaluateAction },
  ProposedAction: {}
}));

jest.unstable_mockModule('../src/services/AutonomousService.js', () => ({
  AutonomousService: { logAction: mockLogAction }
}));

const { AutonomousTaskExecutor } = await import('../src/services/AutonomousTaskExecutor.js');

describe('AutonomousTaskExecutor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute task when allowed', async () => {
    mockEvaluateAction.mockResolvedValue({ decision: 'Allow' });
    const task = jest.fn().mockResolvedValue('success');

    const result = await AutonomousTaskExecutor.execute(
      { type: 'Test Task', impact: 'low', module: 'Test' },
      task
    );

    expect(result).toBe('success');
    expect(mockLogAction).toHaveBeenCalledWith('Test Task', 'Started', expect.any(Object));
    expect(mockLogAction).toHaveBeenCalledWith('Test Task', 'Completed', expect.any(Object));
  });

  it('should throw error and log failure when denied', async () => {
    mockEvaluateAction.mockResolvedValue({ decision: 'Deny', reason: 'Too risky' });
    const task = jest.fn();

    await expect(AutonomousTaskExecutor.execute(
      { type: 'Risky Task', impact: 'high', module: 'Test' },
      task
    )).rejects.toThrow('Action Denied: Too risky');

    expect(mockLogAction).toHaveBeenCalledWith('Risky Task', 'Failed', expect.objectContaining({ reason: 'Too risky', status: 'Denied' }));
    expect(task).not.toHaveBeenCalled();
  });

  it('should log failure when task throws', async () => {
    mockEvaluateAction.mockResolvedValue({ decision: 'Allow' });
    const task = jest.fn().mockRejectedValue(new Error('Task failed'));

    await expect(AutonomousTaskExecutor.execute(
      { type: 'Failing Task', impact: 'low', module: 'Test' },
      task
    )).rejects.toThrow('Task failed');

    expect(mockLogAction).toHaveBeenCalledWith('Failing Task', 'Failed', expect.objectContaining({ error: 'Task failed' }));
  });

  // --- Regression tests for the transient-login-401 root cause (v2.3.39) ---

  it('should return the result even if the Completed audit log fails', async () => {
    // Before the fix the "Completed" logAction ran inside the try block: a
    // failed ledger write fell into catch and RE-THREW, turning an
    // already-successful login into a 401.
    mockEvaluateAction.mockResolvedValue({ decision: 'Allow' });
    mockLogAction.mockImplementation(async (_type: string, status: string) => {
      if (status === 'Completed') throw new Error('ledger table locked');
    });
    const task = jest.fn().mockResolvedValue('logged-in');

    const result = await AutonomousTaskExecutor.execute(
      { type: 'User Login', impact: 'low', module: 'Auth' },
      task,
      { failOpen: true }
    );

    expect(result).toBe('logged-in');
  });

  it('should run the task with failOpen when the decision delegates', async () => {
    mockEvaluateAction.mockResolvedValue({ decision: 'Delegate', reason: 'low health score' });
    const task = jest.fn().mockResolvedValue('ok');

    const result = await AutonomousTaskExecutor.execute(
      { type: 'User Login', impact: 'low', module: 'Auth' },
      task,
      { failOpen: true }
    );

    expect(result).toBe('ok');
    expect(task).toHaveBeenCalled();
  });

  it('should run the task with failOpen when the decision engine throws', async () => {
    mockEvaluateAction.mockRejectedValue(new Error('governance db down'));
    const task = jest.fn().mockResolvedValue('ok');

    const result = await AutonomousTaskExecutor.execute(
      { type: 'User Login', impact: 'low', module: 'Auth' },
      task,
      { failOpen: true }
    );

    expect(result).toBe('ok');
  });

  it('should still throw on Delegate without failOpen (governance preserved)', async () => {
    mockEvaluateAction.mockResolvedValue({ decision: 'Delegate', reason: 'needs oversight' });
    const task = jest.fn();

    await expect(AutonomousTaskExecutor.execute(
      { type: 'Schema Change', impact: 'high', module: 'DB' },
      task
    )).rejects.toThrow('Action Delegated: needs oversight');

    expect(task).not.toHaveBeenCalled();
  });
});
