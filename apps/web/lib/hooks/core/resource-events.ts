import type { ResourceEvent, ResourceEventType } from './types';

type EventHandler<T = unknown> = (event: ResourceEvent<T>) => void;

class ResourceEventEmitter {
  private listeners = new Map<string, Set<EventHandler>>();

  on<T = unknown>(resource: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(resource)) this.listeners.set(resource, new Set());
    const handlers = this.listeners.get(resource)!;
    handlers.add(handler as EventHandler);
    return () => handlers.delete(handler as EventHandler);
  }

  onAny(handler: EventHandler): () => void {
    return this.on('*', handler);
  }

  emit<T = unknown>(
    resource: string,
    type: ResourceEventType,
    payload?: { data?: T; id?: string; ids?: string[] },
  ): void {
    const event: ResourceEvent<T> = {
      resource,
      type,
      timestamp: Date.now(),
      ...payload,
    };

    this.listeners.get(resource)?.forEach((h) => h(event));
    this.listeners.get('*')?.forEach((h) => h(event));
  }
}

export const resourceEvents = new ResourceEventEmitter();
