#!/usr/bin/env node
// Google Cloud Text-to-Speech (en-US-Neural2-F) で単語・例文の音声ファイルを
// 事前生成するスクリプト。アプリの実行時にはAPIを呼び出さない
// （一度だけ実行してaudio/以下にmp3を生成する。Web Speech APIへのフォールバックは無し）。
//
// 声の選定メモ: en-US-Chirp3-HD-Zephyr の方が声の自然さ・聞き取りやすさは上だったが、
// 不規則動詞3活用「put, put, put.」のような同一語の繰り返しに対して、冒頭の無音の長さが
// 単語ごとにランダムにばらつき（0.3〜0.8秒とバラバラ）、その分だけ実際の発話が
// 圧縮されてテンポが不揃いになる問題があった。SSMLのbreakタグでの制御も試したが、
// 指定時間（400ms）通りに反映されず（実際は900ms近くになる）信頼できなかった。
// Neural2-F は同じテキストに対して無音区間の位置・長さが一貫しており、
// テンポの均一性を優先してこちらを採用している。
//
// 使い方:
//   GOOGLE_TTS_API_KEY=xxxxx node scripts/generate-audio.js
//
// 再生成が必要になったとき（単語・例文を追加/変更したとき）に再実行する。
//
// 声を切り替えたい場合（例: 男性声セットを追加）は環境変数で出力先を変える。
//   GOOGLE_TTS_API_KEY=xxxxx \
//   TTS_VOICE_NAME=en-US-Neural2-D \
//   TTS_OUT_DIR=audio-male \
//   TTS_MANIFEST_PATH=js/data/audioManifestMale.js \
//   TTS_MANIFEST_VAR=AUDIO_MANIFEST_MALE \
//   node scripts/generate-audio.js

const fs = require('fs');
const path = require('path');
const https = require('https');

const API_KEY = process.env.GOOGLE_TTS_API_KEY;
if (!API_KEY) {
  console.error('環境変数 GOOGLE_TTS_API_KEY を設定してください。');
  process.exit(1);
}

const VOICE_NAME = process.env.TTS_VOICE_NAME || 'en-US-Neural2-F';
const LANGUAGE_CODE = process.env.TTS_LANGUAGE_CODE || (VOICE_NAME.startsWith('en-GB') ? 'en-GB' : 'en-US');
const OUT_DIR_NAME = process.env.TTS_OUT_DIR || 'audio';
const MANIFEST_PATH = process.env.TTS_MANIFEST_PATH || 'js/data/audioManifest.js';
const MANIFEST_VAR = process.env.TTS_MANIFEST_VAR || 'AUDIO_MANIFEST';

const ROOT = path.join(__dirname, '..');

// words.js / verbs.js は window.XXX に代入する形なので window を用意して読み込む
global.window = global;
require(path.join(ROOT, 'js/data/verbs.js'));
require(path.join(ROOT, 'js/data/words.js'));

const words = global.JHS_WORDS;
const verbs = global.IRREGULAR_VERBS;

// audio.js の speak() と同じクリーニングルール
function cleanText(text) {
  return text.replace(/~ing|~|\(.*\)/g, '').replace(/\//g, ' ').trim();
}

// audio.js の speakVerbForms() と同じ組み立てロジック
function buildVerbCombined(present, past, participle) {
  let cleanPresent = present.replace(/~ing|~|\(.*\)/g, '').trim();
  let cleanPast = past.replace(/~ing|~|\(.*\)/g, '').trim();
  let cleanParticiple = participle.replace(/~ing|~|\(.*\)/g, '').trim();

  if (cleanPresent.toLowerCase() === 'be') {
    cleanPresent = 'be';
    cleanPast = 'was';
  }
  if (cleanPresent.toLowerCase() === 'read') {
    cleanPast = 'red';
    cleanParticiple = 'red';
  }
  if (cleanPresent.toLowerCase() === 'lead') {
    cleanPresent = 'leed';
  }

  return `${cleanPresent}, ${cleanPast}, ${cleanParticiple}.`;
}

// text(発音される文字列そのまま) -> { slug, type } のMap
// type: 'word'(単語) / 'verb'(不規則動詞3活用) / 'example'(例文)
// 例文は情報量が多く、単語・動詞3活用と同じ再生速度では速く感じるため、
// audio.js側でtypeを見て速度を調整する。
const entries = new Map();

function addEntry(text, slug, type) {
  const clean = cleanText(text);
  if (!clean || entries.has(clean)) return;
  entries.set(clean, { slug, type });
}

words.forEach((w) => {
  addEntry(w.word, `word-${w.id}`, 'word');
  addEntry(w.example, `word-${w.id}-example`, 'example');
});

verbs.forEach((v) => {
  const combined = buildVerbCombined(v.present, v.past, v.participle);
  if (!entries.has(combined)) entries.set(combined, { slug: `verb-${v.id}`, type: 'verb' });
  addEntry(v.example, `verb-${v.id}-example`, 'example');
});

console.log(`生成対象: ${entries.size} 件 (声: ${VOICE_NAME}, 出力先: ${OUT_DIR_NAME}/)`);

const outDir = path.join(ROOT, OUT_DIR_NAME);
fs.mkdirSync(outDir, { recursive: true });

function synthesize(text) {
  const body = JSON.stringify({
    input: { text },
    voice: { languageCode: LANGUAGE_CODE, name: VOICE_NAME },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 1.0, pitch: 0 },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'texttospeech.googleapis.com',
        path: `/v1/text:synthesize?key=${API_KEY}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
            return;
          }
          try {
            resolve(JSON.parse(data).audioContent);
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const manifest = {};

async function main() {
  let i = 0;
  const failures = [];
  for (const [text, { slug, type }] of entries) {
    i++;
    const filename = `${slug}.mp3`;
    const filePath = path.join(outDir, filename);

    // 既に生成済みなら再利用（API課金・呼び出し回数を節約。強制再生成したい場合は
    // 出力先フォルダ内の該当ファイルを削除してから実行する）
    if (fs.existsSync(filePath)) {
      process.stdout.write(`[${i}/${entries.size}] (再利用) ${text}\n`);
      manifest[text] = { path: `${OUT_DIR_NAME}/${filename}`, type };
      continue;
    }

    process.stdout.write(`[${i}/${entries.size}] ${text}\n`);
    try {
      const audioContentB64 = await synthesize(text);
      fs.writeFileSync(filePath, Buffer.from(audioContentB64, 'base64'));
      manifest[text] = { path: `${OUT_DIR_NAME}/${filename}`, type };
    } catch (err) {
      failures.push({ text, error: err.message });
      console.error(`  失敗: ${err.message}`);
    }
    await new Promise((r) => setTimeout(r, 30));
  }

  const manifestPath = path.join(ROOT, MANIFEST_PATH);
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(
    manifestPath,
    `// 自動生成ファイル: scripts/generate-audio.js で作成 (声: ${VOICE_NAME})\n` +
      `// Google Cloud Text-to-Speechで事前生成した音声の (発音テキスト -> mp3パス) マッピング\n` +
      `window.${MANIFEST_VAR} = ${JSON.stringify(manifest, null, 2)};\n`
  );

  console.log(`\n完了: ${entries.size - failures.length}/${entries.size} 件成功`);
  if (failures.length > 0) {
    console.log('失敗一覧:');
    failures.forEach((f) => console.log(`  - ${f.text}: ${f.error}`));
  }
}

main();
