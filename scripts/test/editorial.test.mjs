import test from 'node:test';
import assert from 'node:assert/strict';
import {additionalSources} from '../../assets/insights-sources.mjs';

test('additional headlines exclude represented articles, tracking variants, duplicates and invalid sources', () => {
  const article = url => ({url, title:'A sourced headline',source:'Publisher',published:'2026-11-03',category:'power'});
  const selected = additionalSources([
    article('https://www.publisher.example/story/?utm_source=newsletter'),
    article('https://publisher.example/other'),
    article('https://publisher.example/other#summary'),
    article('javascript:alert(1)'),
    article('https://publisher.example/third')
  ], ['https://publisher.example/story']);
  assert.deepEqual(selected.map(story => story.url), ['https://publisher.example/other','https://publisher.example/third']);
});
