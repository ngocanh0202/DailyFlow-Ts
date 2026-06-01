import React from 'react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SettingsPanel from './SettingsPanel';

const originalLocalStorage = globalThis.localStorage;

const mockLocalStorage = (values: Record<string, string>) => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: vi.fn((key: string) => values[key] ?? null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
  });
};

describe('SettingsPanel', () => {
  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: originalLocalStorage,
    });
    vi.restoreAllMocks();
  });

  it('renders when the stored theme preference is malformed', () => {
    mockLocalStorage({ isDarkTheme: '{bad json' });

    expect(() => renderToString(<SettingsPanel />)).not.toThrow();
  });
});
