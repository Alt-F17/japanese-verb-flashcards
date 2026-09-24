import test from 'node:test';
import assert from 'node:assert/strict';
import { VERB_DECKS, VERBS } from '../verbs.js';

const GODAN_I = { う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に', ぶ: 'び', む: 'み', る: 'り' };
const I_OR_E_ROW = 'いきぎしじちぢにひびぴみりえけげせぜてでねへべぺめれ';
const HIRAGANA = /^[ぁ-ゟ]+$/;
const HIRAGANA_ONLY = ['する', 'ある', 'いる', 'あげる', 'もらう', 'くれる', 'つける', 'できる', 'なる', 'かぶる', 'かける', 'なくす'];

function expectedPolite({ kanji, kana, type }) {
  const base = kanji ?? kana;
  if (type === 'irregular') {
    if (base === '来る') return '来ます（きます）';
    assert.ok(base.endsWith('する'), `${base}: only する/来る are irregular`);
    return base.slice(0, -2) + 'します';
  }
  if (type === 'ichidan') return base.slice(0, -1) + 'ます';
  const i = GODAN_I[base.at(-1)];
  assert.ok(i, `${base}: not a godan ending`);
  return base.slice(0, -1) + i + 'ます';
}

test('4 decks of exactly 50, 200 total', () => {
  assert.equal(VERB_DECKS.length, 4);
  for (const d of VERB_DECKS) assert.equal(d.cards.length, 50, d.id);
  assert.equal(VERBS.length, 200);
});

test('every verb is unique', () => {
  const keys = VERBS.map((v) => `${v.kanji ?? ''}|${v.kana}`);
  const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
  assert.deepEqual(dupes, []);
  assert.equal(new Set(VERBS.map((v) => v.id)).size, VERBS.length);
});

test('all fields are present and well formed', () => {
  for (const v of VERBS) {
    assert.ok(HIRAGANA.test(v.kana), `${v.id}: kana must be hiragana (${v.kana})`);
    assert.ok(v.english.startsWith('to '), `${v.id}: english should start with "to "`);
    assert.ok(['godan', 'ichidan', 'irregular'].includes(v.type), `${v.id}: bad type`);
    if (v.kanji) {
      assert.ok(/[一-鿿]/.test(v.kanji), `${v.id}: kanji field has no kanji`);
      assert.equal(v.kanji.at(-1), v.kana.at(-1), `${v.id}: okurigana mismatch`);
    }
  }
});

test('no CJK radical lookalikes (PDF copy-paste artifacts)', () => {
  const bad = /[⺀-⿟]/;
  for (const v of VERBS) {
    for (const field of [v.kanji ?? '', v.kana, v.polite]) {
      assert.ok(!bad.test(field), `${v.id}: radical codepoint in "${field}"`);
    }
  }
});

test('hiragana-only verbs are exactly the ones normally written in kana', () => {
  assert.deepEqual(VERBS.filter((v) => !v.kanji).map((v) => v.kana).sort(), [...HIRAGANA_ONLY].sort());
});

test('polite ます-form matches the conjugation rule for every verb', () => {
  for (const v of VERBS) assert.equal(v.polite, expectedPolite(v), v.id);
});

test('ichidan verbs end in an i- or e-row sound + る', () => {
  for (const v of VERBS.filter((x) => x.type === 'ichidan')) {
    assert.equal(v.kana.at(-1), 'る', v.id);
    assert.ok(I_OR_E_ROW.includes(v.kana.at(-2)), `${v.id}: ${v.kana} can't be ichidan`);
  }
});

test('PRD fixes: duplicates replaced, real kanji used', () => {
  const core = VERB_DECKS[0].cards.map((v) => v.kanji ?? v.kana);
  for (const w of ['着る', '洗う', '乗る', '食べる', '行く', '見る', '言う', '入る', '立つ', '走る']) {
    assert.ok(core.includes(w), `core deck missing ${w}`);
  }
});
