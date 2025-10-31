/**
 * Storage utility for persisting data
 * Note: React Native doesn't have localStorage, we'll use a simple in-memory store
 * In production, you should use @react-native-async-storage/async-storage
 */

class Storage {
  private store: Map<string, string> = new Map();

  async setItem(key: string, value: string): Promise<void> {
    this.store.set(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async removeItem(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async setObject<T>(key: string, value: T): Promise<void> {
    const jsonValue = JSON.stringify(value);
    await this.setItem(key, jsonValue);
  }

  async getObject<T>(key: string): Promise<T | null> {
    const jsonValue = await this.getItem(key);
    return jsonValue ? JSON.parse(jsonValue) : null;
  }
}

export const storage = new Storage();
