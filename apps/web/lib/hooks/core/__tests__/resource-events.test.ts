import { resourceEvents } from '../resource-events';

describe('ResourceEventEmitter', () => {
  afterEach(() => {
    // Clean up all listeners by creating fresh subscriptions and immediately unsubscribing
    // The emitter is a singleton so we need to be careful about test isolation
  });

  it('emits events to subscribed handlers', () => {
    const handler = jest.fn();
    const unsubscribe = resourceEvents.on('customers', handler);

    resourceEvents.emit('customers', 'created', { data: { id: '1' } });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'customers',
        type: 'created',
        data: { id: '1' },
        timestamp: expect.any(Number),
      }),
    );

    unsubscribe();
  });

  it('does not emit to unsubscribed handlers', () => {
    const handler = jest.fn();
    const unsubscribe = resourceEvents.on('customers', handler);

    unsubscribe();
    resourceEvents.emit('customers', 'created');

    expect(handler).not.toHaveBeenCalled();
  });

  it('does not emit to handlers for different resources', () => {
    const handler = jest.fn();
    const unsubscribe = resourceEvents.on('customers', handler);

    resourceEvents.emit('projects', 'created');

    expect(handler).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('supports wildcard listener via onAny', () => {
    const handler = jest.fn();
    const unsubscribe = resourceEvents.onAny(handler);

    resourceEvents.emit('customers', 'created');
    resourceEvents.emit('projects', 'deleted', { id: '2' });

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'customers', type: 'created' }),
    );
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'projects', type: 'deleted', id: '2' }),
    );

    unsubscribe();
  });

  it('supports multiple handlers for the same resource', () => {
    const handler1 = jest.fn();
    const handler2 = jest.fn();
    const unsub1 = resourceEvents.on('vendors', handler1);
    const unsub2 = resourceEvents.on('vendors', handler2);

    resourceEvents.emit('vendors', 'updated');

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);

    unsub1();
    unsub2();
  });

  it('includes ids in bulkDeleted events', () => {
    const handler = jest.fn();
    const unsubscribe = resourceEvents.on('tasks', handler);

    resourceEvents.emit('tasks', 'bulkDeleted', { ids: ['1', '2', '3'] });

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'tasks',
        type: 'bulkDeleted',
        ids: ['1', '2', '3'],
      }),
    );

    unsubscribe();
  });

  it('includes timestamp in every event', () => {
    const handler = jest.fn();
    const unsubscribe = resourceEvents.on('test', handler);
    const before = Date.now();

    resourceEvents.emit('test', 'created');

    const event = handler.mock.calls[0][0];
    expect(event.timestamp).toBeGreaterThanOrEqual(before);
    expect(event.timestamp).toBeLessThanOrEqual(Date.now());

    unsubscribe();
  });
});
