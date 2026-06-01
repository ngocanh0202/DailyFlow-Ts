import { describe, expect, it } from 'vitest';
import { calculateProgressWidth, formatTime } from './utils';

describe('utils', () => {
  it('formats invalid or negative durations as zero time', () => {
    expect(formatTime(-1)).toBe('00:00:00');
    expect(formatTime(Number.NaN)).toBe('00:00:00');
    expect(formatTime(Number.POSITIVE_INFINITY)).toBe('00:00:00');
  });

  it('clamps progress width to the visible progress bar range', () => {
    expect(calculateProgressWidth(12, 10)).toBe('100%');
    expect(calculateProgressWidth(-1, 10)).toBe('0%');
  });
});
