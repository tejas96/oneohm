import {
  TASK_PRIORITY_CATALOG,
  TASK_STATUS_CATALOG,
  getCompleteTaskStatus,
  taskStatusBlocksDependents,
  taskStatusRequiresResolvedDependencies,
} from './task-catalog';
import { TaskPriority, TaskStatus } from '../types/enums/project.enum';

describe('task-catalog', () => {
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

  describe('taskStatusBlocksDependents (blocksDependents !== false)', () => {
    it('blocks for backlog/todo (missing flag)', () => {
      expect(taskStatusBlocksDependents(TaskStatus.BACKLOG)).toBe(true);
      expect(taskStatusBlocksDependents(TaskStatus.TODO)).toBe(true);
    });

    it('does not block for done/cancelled', () => {
      expect(taskStatusBlocksDependents(TaskStatus.DONE)).toBe(false);
      expect(taskStatusBlocksDependents(TaskStatus.CANCELLED)).toBe(false);
    });

    it('blocks for in_progress and blocked', () => {
      expect(taskStatusBlocksDependents(TaskStatus.IN_PROGRESS)).toBe(true);
      expect(taskStatusBlocksDependents(TaskStatus.BLOCKED)).toBe(true);
    });
  });

  describe('taskStatusRequiresResolvedDependencies', () => {
    it('does not require deps for backlog/todo/blocked', () => {
      expect(taskStatusRequiresResolvedDependencies(TaskStatus.BACKLOG)).toBe(false);
      expect(taskStatusRequiresResolvedDependencies(TaskStatus.TODO)).toBe(false);
      expect(taskStatusRequiresResolvedDependencies(TaskStatus.BLOCKED)).toBe(false);
    });

    it('requires deps for in_progress, in_review, testing, done', () => {
      expect(taskStatusRequiresResolvedDependencies(TaskStatus.IN_PROGRESS)).toBe(true);
      expect(taskStatusRequiresResolvedDependencies(TaskStatus.IN_REVIEW)).toBe(true);
      expect(taskStatusRequiresResolvedDependencies(TaskStatus.TESTING)).toBe(true);
      expect(taskStatusRequiresResolvedDependencies(TaskStatus.DONE)).toBe(true);
    });

    it('does not require deps for cancelled (isFinal but no autoCompletePct 100)', () => {
      expect(taskStatusRequiresResolvedDependencies(TaskStatus.CANCELLED)).toBe(false);
    });
  });
});
