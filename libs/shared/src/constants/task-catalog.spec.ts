import {
  SUPPORTED_TASK_STATUSES,
  TASK_PRIORITY_CATALOG,
  TASK_STATUS_CATALOG,
  getCompleteTaskStatus,
  isSupportedTaskStatus,
  normalizeTaskStatus,
  taskStatusBlocksDependents,
  taskStatusRequiresResolvedDependencies,
} from './task-catalog';
import { TaskPriority, TaskStatus } from '../types/enums/project.enum';

describe('task-catalog', () => {
  it('supports exactly four task statuses', () => {
    expect(SUPPORTED_TASK_STATUSES).toEqual([
      TaskStatus.BACKLOG,
      TaskStatus.IN_PROGRESS,
      TaskStatus.BLOCKED,
      TaskStatus.DONE,
    ]);
    expect(Object.keys(TASK_STATUS_CATALOG).sort()).toEqual([...SUPPORTED_TASK_STATUSES].sort());
  });

  it('covers every TaskStatus enum value', () => {
    const enumValues = Object.values(TaskStatus);
    expect(Object.keys(TASK_STATUS_CATALOG).sort()).toEqual([...enumValues].sort());
  });

  it('covers every TaskPriority enum value', () => {
    const enumValues = Object.values(TaskPriority);
    expect(Object.keys(TASK_PRIORITY_CATALOG).sort()).toEqual([...enumValues].sort());
  });

  it('has unique orderIndex per status and priority', () => {
    const statusOrders = Object.values(TASK_STATUS_CATALOG).map((e) => e.orderIndex);
    const priorityOrders = Object.values(TASK_PRIORITY_CATALOG).map((e) => e.orderIndex);
    expect(new Set(statusOrders).size).toBe(statusOrders.length);
    expect(new Set(priorityOrders).size).toBe(priorityOrders.length);
  });

  it('has exactly one status with autoCompletePct === 100', () => {
    const complete = Object.values(TASK_STATUS_CATALOG).filter((e) => e.autoCompletePct === 100);
    expect(complete).toHaveLength(1);
    expect(complete[0]?.code).toBe(TaskStatus.DONE);
    expect(getCompleteTaskStatus()).toBe(TaskStatus.DONE);
  });

  it('normalizes legacy statuses to backlog', () => {
    expect(normalizeTaskStatus('todo')).toBe(TaskStatus.BACKLOG);
    expect(normalizeTaskStatus('in_review')).toBe(TaskStatus.BACKLOG);
    expect(normalizeTaskStatus('testing')).toBe(TaskStatus.BACKLOG);
    expect(normalizeTaskStatus('cancelled')).toBe(TaskStatus.BACKLOG);
    expect(isSupportedTaskStatus('todo')).toBe(false);
  });

  describe('taskStatusBlocksDependents (blocksDependents !== false)', () => {
    it('blocks for backlog and in_progress', () => {
      expect(taskStatusBlocksDependents(TaskStatus.BACKLOG)).toBe(true);
      expect(taskStatusBlocksDependents(TaskStatus.IN_PROGRESS)).toBe(true);
    });

    it('does not block for done', () => {
      expect(taskStatusBlocksDependents(TaskStatus.DONE)).toBe(false);
    });

    it('blocks for blocked', () => {
      expect(taskStatusBlocksDependents(TaskStatus.BLOCKED)).toBe(true);
    });
  });

  describe('taskStatusRequiresResolvedDependencies', () => {
    it('does not require deps for backlog/blocked', () => {
      expect(taskStatusRequiresResolvedDependencies(TaskStatus.BACKLOG)).toBe(false);
      expect(taskStatusRequiresResolvedDependencies(TaskStatus.BLOCKED)).toBe(false);
    });

    it('requires deps for in_progress and done', () => {
      expect(taskStatusRequiresResolvedDependencies(TaskStatus.IN_PROGRESS)).toBe(true);
      expect(taskStatusRequiresResolvedDependencies(TaskStatus.DONE)).toBe(true);
    });
  });
});
