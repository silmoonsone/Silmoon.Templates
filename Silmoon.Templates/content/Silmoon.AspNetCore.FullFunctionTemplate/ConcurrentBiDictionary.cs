using System;
using System.Collections;
using System.Collections.Concurrent;


namespace Silmoon.AspNetCore.FullFunctionTemplate
{
    public class ConcurrentBiDictionary<TKey, TValue> : IEnumerable<KeyValuePair<TKey, TValue>>
    {
        private readonly ConcurrentDictionary<TKey, TValue> _forward = new();
        private readonly ConcurrentDictionary<TValue, TKey> _reverse = new();
        private readonly object _syncRoot = new();

        public bool TryAdd(TKey key, TValue value)
        {
            lock (_syncRoot)
            {
                if (_forward.ContainsKey(key) || _reverse.ContainsKey(value))
                    return false;

                _forward[key] = value;
                _reverse[value] = key;
                return true;
            }
        }

        public void Add(TKey key, TValue value)
        {
            lock (_syncRoot)
            {
                if (_forward.ContainsKey(key))
                    throw new ArgumentException($"Key '{key}' already exists.");
                if (_reverse.ContainsKey(value))
                    throw new ArgumentException($"Value '{value}' already exists.");

                _forward[key] = value;
                _reverse[value] = key;
            }
        }

        public bool TryRemoveByKey(TKey key, out TValue value)
        {
            lock (_syncRoot)
            {
                if (_forward.TryRemove(key, out value))
                {
                    _reverse.TryRemove(value, out _);
                    return true;
                }
                return false;
            }
        }

        public void RemoveByKey(TKey key)
        {
            lock (_syncRoot)
            {
                if (!_forward.TryRemove(key, out var value))
                    throw new KeyNotFoundException($"Key '{key}' not found.");

                _reverse.TryRemove(value, out _);
            }
        }

        public bool TryRemoveByValue(TValue value, out TKey key)
        {
            lock (_syncRoot)
            {
                if (_reverse.TryRemove(value, out key))
                {
                    _forward.TryRemove(key, out _);
                    return true;
                }
                return false;
            }
        }

        public void RemoveByValue(TValue value)
        {
            lock (_syncRoot)
            {
                if (!_reverse.TryRemove(value, out var key))
                    throw new KeyNotFoundException($"Value '{value}' not found.");

                _forward.TryRemove(key, out _);
            }
        }

        public bool TryGetValueByKey(TKey key, out TValue value) => _forward.TryGetValue(key, out value);
        public bool TryGetKeyByValue(TValue value, out TKey key) => _reverse.TryGetValue(value, out key);

        public TValue GetValueByKey(TKey key)
        {
            if (_forward.TryGetValue(key, out var value))
                return value;
            throw new KeyNotFoundException($"Key '{key}' not found.");
        }

        public TKey GetKeyByValue(TValue value)
        {
            if (_reverse.TryGetValue(value, out var key))
                return key;
            throw new KeyNotFoundException($"Value '{value}' not found.");
        }

        public bool ContainsKey(TKey key) => _forward.ContainsKey(key);
        public bool ContainsValue(TValue value) => _reverse.ContainsKey(value);

        public TValue this[TKey key]
        {
            get => GetValueByKey(key);
            set
            {
                lock (_syncRoot)
                {
                    if (_forward.TryGetValue(key, out var oldValue))
                    {
                        _reverse.TryRemove(oldValue, out _);
                    }

                    _forward[key] = value;
                    _reverse[value] = key;
                }
            }
        }

        public IEnumerable<TKey> Keys => _forward.Keys;
        public IEnumerable<TValue> Values => _reverse.Keys;
        public int Count => _forward.Count;

        public IEnumerator<KeyValuePair<TKey, TValue>> GetEnumerator() => _forward.GetEnumerator();
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }
}
