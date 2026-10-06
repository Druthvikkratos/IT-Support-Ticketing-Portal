import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ConfigCacheService {
  save(key: string, value: unknown) {
    try {
      localStorage.setItem(`infodesk_cache_${key}`, JSON.stringify(value));
    } catch {}
  }

  read<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(`infodesk_cache_${key}`);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (error) {
      return null;
    }
  }
}
