import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LRUCache } from './cache';

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    cache = new LRUCache<string>(3, 1); // Max 3 items, 1 minute TTL
  });

  it('should store and retrieve values', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return undefined for non-existent keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should evict oldest entry when capacity is exceeded', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    cache.set('key4', 'value4'); // Should evict key1

    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
  });

  it('should update LRU order on get', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');

    // Access key1 to make it most recently used
    cache.get('key1');

    // Add key4, should evict key2 (oldest)
    cache.set('key4', 'value4');

    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBeUndefined();
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
  });

  it('should expire entries after TTL', async () => {
    const shortCache = new LRUCache<string>(10, 0.01); // 0.01 minute = 600ms
    shortCache.set('key1', 'value1');

    expect(shortCache.get('key1')).toBe('value1');

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 700));

    expect(shortCache.get('key1')).toBeUndefined();
  });

  it('should clear all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');

    expect(cache.size()).toBe(3);

    cache.clear();

    expect(cache.size()).toBe(0);
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
    expect(cache.get('key3')).toBeUndefined();
  });

  it('should update existing key position', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');

    // Update key1
    cache.set('key1', 'updated');

    // Add key4, should evict key2 (oldest)
    cache.set('key4', 'value4');

    expect(cache.get('key1')).toBe('updated');
    expect(cache.get('key2')).toBeUndefined();
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
  });

  it('should report correct size', () => {
    expect(cache.size()).toBe(0);

    cache.set('key1', 'value1');
    expect(cache.size()).toBe(1);

    cache.set('key2', 'value2');
    expect(cache.size()).toBe(2);

    cache.get('key1');
    expect(cache.size()).toBe(2);

    cache.clear();
    expect(cache.size()).toBe(0);
  });
});
