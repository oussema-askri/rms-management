// This file used to hold Create React App's boilerplate test asserting a
// "learn react" link, which this app has never rendered, so `npm test` always
// failed. These cover the response-shape helper instead, which every screen
// depends on and which is pure enough to test without a DOM.

import { unwrap, unwrapList } from './services/unwrap';

describe('unwrap', () => {
  test('reads the standard { success, data } envelope', () => {
    expect(unwrap({ data: { success: true, data: { _id: '1' } } })).toEqual({ _id: '1' });
  });

  test('still accepts a bare payload', () => {
    // routes/client.js returned bare objects until the shapes were unified.
    expect(unwrap({ data: { _id: '1' } })).toEqual({ _id: '1' });
  });

  test('falls back when the envelope carries no data', () => {
    expect(unwrap({ data: { success: true, data: null } }, 'fallback')).toBe('fallback');
    expect(unwrap(undefined, 'fallback')).toBe('fallback');
    expect(unwrap({}, 'fallback')).toBe('fallback');
  });

  test('does not mistake a payload that happens to contain a data key', () => {
    const body = { data: [1, 2] };
    expect(unwrap({ data: body })).toEqual([1, 2]);
  });
});

describe('unwrapList', () => {
  test('returns the array from either shape', () => {
    expect(unwrapList({ data: { success: true, data: [1, 2] } })).toEqual([1, 2]);
    expect(unwrapList({ data: [1, 2] })).toEqual([1, 2]);
  });

  test('never returns a non-array, so callers can map safely', () => {
    expect(unwrapList({ data: { success: true, data: null } })).toEqual([]);
    expect(unwrapList({ data: { success: true } })).toEqual([]);
    expect(unwrapList(undefined)).toEqual([]);
    expect(unwrapList({ data: 'unexpected' })).toEqual([]);
  });
});
