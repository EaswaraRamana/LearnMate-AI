import assert from 'node:assert/strict';
import test from 'node:test';
import { getGeminiFailure, getSafeGeminiErrorMetadata } from './gemini.ts';

test('classifies Gemini bad-request errors with upstream status', () => {
  const failure = getGeminiFailure({
    status: 400,
    message: 'Invalid temperature for model.'
  }, 'Tutor');

  assert.equal(failure.code, 'UPSTREAM_BAD_REQUEST');
  assert.equal(failure.upstreamStatus, 400);
  assert.equal(failure.status, 502);
});

test('classifies nested rate-limit errors', () => {
  const failure = getGeminiFailure({
    response: { status: '429' },
    error: { code: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded.' }
  }, 'Quiz');

  assert.equal(failure.code, 'QUOTA_EXCEEDED');
  assert.equal(failure.upstreamStatus, 429);
});

test('classifies invalid credentials without leaking upstream details to the caller', () => {
  const failure = getGeminiFailure({
    status: 403,
    message: 'API key is not permitted.'
  }, 'Tutor');

  assert.equal(failure.code, 'INVALID_API_KEY');
  assert.equal(failure.upstreamStatus, 403);
  assert.doesNotMatch(failure.message, /API key is not permitted/);
});

test('redacts API credentials and submitted input from diagnostic metadata', () => {
  const apiKey = `AIza${'a'.repeat(35)}`;
  const prompt = 'Private student study content';
  const metadata = getSafeGeminiErrorMetadata({
    status: 400,
    code: 'INVALID_ARGUMENT',
    message: `Rejected ${prompt}; key=${apiKey}; Authorization: Bearer private-token`
  }, [prompt]);

  assert.equal(metadata.status, 400);
  assert.equal(metadata.code, 'INVALID_ARGUMENT');
  assert.doesNotMatch(metadata.message || '', /Private student study content|AIza|private-token/);
  assert.match(metadata.message || '', /\[REDACTED_INPUT\]/);
  assert.match(metadata.message || '', /\[REDACTED_API_KEY\]/);
});

test('handles primitive and SDK-style errors without throwing', () => {
  assert.deepEqual(getSafeGeminiErrorMetadata('network unavailable'), {});

  const failure = getGeminiFailure({
    name: 'ApiError',
    status: 503,
    message: 'Service unavailable.'
  }, 'Transcription');
  assert.equal(failure.code, 'UPSTREAM_UNAVAILABLE');
  assert.equal(failure.upstreamStatus, 503);
});
