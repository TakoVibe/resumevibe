import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatProfileUrl } from '../src/lib/resumeSanitizer.ts';

test('printed profile links drop only the scheme, www and trailing slash', () => {
    assert.equal(formatProfileUrl('https://www.linkedin.com/in/rahulbeniwal26119/'), 'linkedin.com/in/rahulbeniwal26119');
    assert.equal(formatProfileUrl('http://github.com/johndoe'), 'github.com/johndoe');
    assert.equal(formatProfileUrl(' HTTPS://WWW.example.dev/ '), 'example.dev');
});
