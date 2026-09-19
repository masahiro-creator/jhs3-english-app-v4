#!/usr/bin/env node
// Chirp3-HD系の声（例: en-US-Chirp3-HD-Sulafat, en-US-Chirp3-HD-Orus）向けの
// 音声事前生成スクリプト。
//
// Chirp3-HDは声の自然さは良いが、"put, put, put." のように同じ単語を繰り返す
// 不規則動詞3活用のテキストを1回のAPI呼び出しで読ませると、冒頭の無音の長さが
// 単語ごとにランダムにばらつき（0.3〜0.9秒とバラバラ）、テンポが不揃いになる
// （generate-audio.js のコメント参照）。
//
// そのため、typeが'verb'のエントリだけは
//   1. present/past/participleを個別にAPI呼び出しで生成
//   2. 各単語の前後の無音をffmpegでトリミング
//   3. 一定間隔(GAP_MS)の無音を自分で挿入して結合
// という方式でテンポを完全に制御する。word/exampleは通常通り1回の呼び出しで
// 生成し、前後の無音だけトリミングして揃える。
//
// 使い方:
//   GOOGLE_TTS_API_KEY=xxxxx \
//   TTS_VOICE_NAME=en-US-Chirp3-HD-Sulafat \
//   TTS_OUT_DIR=audio-chirp-female \
//   TTS_MANIFEST_PATH=js/data/audioManifestChirpFemale.js \
//   TTS_MANIFEST_VAR=AUDIO_MANIFEST_CHIRP_FEMALE \
//   node scripts/generate-audio-chirp.js

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execFileSync } = require('child_process');
const os = require('os');

const API_KEY = process.env.GOOGLE_TTS_API_KEY;
if (!API_KEY) {
  console.error('環境変数 GOOGLE_TTS_API_KEY を設定してください。');
  process.exit(1);
}

const VOICE_NAME = process.env.TTS_VOICE_NAME;
if (!VOICE_NAME) {
  console.error('環境変数 TTS_VOICE_NAME を設定してください（例: en-US-Chirp3-HD-Sulafat）。');
  process.exit(1);
}
const LANGUAGE_CODE = process.env.TTS_LANGUAGE_CODE || 'en-US';
const OUT_DIR_NAME = process.env.TTS_OUT_DIR;
const MANIFEST_PATH = process.env.TTS_MANIFEST_PATH;
const MANIFEST_VAR = process.env.TTS_MANIFEST_VAR;
if (!OUT_DIR_NAME || !MANIFEST_PATH || !MANIFEST_VAR) {
  console.error('TTS_OUT_DIR / TTS_MANIFEST_PATH / TTS_MANIFEST_VAR をすべて設定してください。');
  process.exit(1);
}

const GAP_MS = 350; // 動詞3活用の単語間の間隔
const TAIL_MS = 250; // 末尾の間隔

const ROOT = path.join(__dirname, '..');

global.window = global;
require(path.join(ROOT, 'js/data/verbs.js'));
require(path.join(ROOT, 'js/data/words.js'));

const words = global.JHS_WORDS;
const verbs = global.IRREGULAR_VERBS;

function cleanText(text) {
  return text.replace(/~ing|~|\(.*\)/g, '').replace(/\//g, ' ').trim();
}

// 【発音特別補正】speakVerbForms()と同じロジックで present/past/participle を単語単位に補正する
function correctVerbWords(present, past, participle) {
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
  return [cleanPresent, cleanPast, cleanParticiple];
}

function combinedVerbText(present, past, participle) {
  const [p, a, b] = correctVerbWords(present, past, participle);
  return `${p}, ${a}, ${b}.`;
}

// text -> { slug, type } (type: 'word' | 'verb' | 'example')
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
  const combined = combinedVerbText(v.present, v.past, v.participle);
  if (!entries.has(combined)) {
    entries.set(combined, {
      slug: `verb-${v.id}`,
      type: 'verb',
      verbWords: correctVerbWords(v.present, v.past, v.participle),
    });
  }
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

async function synthesizeToFile(text, filePath) {
  const audioContentB64 = await synthesize(text);
  fs.writeFileSync(filePath, Buffer.from(audioContentB64, 'base64'));
}

// 前後の無音をトリミング（わずかなパディングを残す）
function trimSilence(inputPath, outputPath) {
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i', inputPath,
      '-af',
      'silenceremove=start_periods=1:start_duration=0:start_threshold=-35dB:start_silence=0.03:' +
        'stop_periods=1:stop_duration=0:stop_threshold=-35dB:stop_silence=0.03',
      '-ar', '24000',
      '-ac', '1',
      outputPath,
    ],
    { stdio: 'ignore' }
  );
}

function makeSilence(durationSec, outputPath) {
  execFileSync(
    'ffmpeg',
    ['-y', '-f', 'lavfi', '-i', `anullsrc=r=24000:cl=mono`, '-t', String(durationSec), '-ar', '24000', '-ac', '1', outputPath],
    { stdio: 'ignore' }
  );
}

function concatFiles(fileList, outputPath) {
  const listPath = path.join(os.tmpdir(), `concat-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
  fs.writeFileSync(listPath, fileList.map((f) => `file '${f}'`).join('\n'));
  execFileSync('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outputPath], {
    stdio: 'ignore',
  });
  fs.unlinkSync(listPath);
}

const wordAudioCache = new Map(); // 単語テキスト -> トリム済みファイルパス（動詞の同一語使い回し用）
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chirp-audio-'));
const gapPath = path.join(tmpDir, 'gap.mp3');
const tailPath = path.join(tmpDir, 'tail.mp3');
makeSilence(GAP_MS / 1000, gapPath);
makeSilence(TAIL_MS / 1000, tailPath);

async function getTrimmedWordClip(word) {
  if (wordAudioCache.has(word)) return wordAudioCache.get(word);
  const rawPath = path.join(tmpDir, `raw-${wordAudioCache.size}.mp3`);
  const trimmedPath = path.join(tmpDir, `trim-${wordAudioCache.size}.mp3`);
  await synthesizeToFile(word, rawPath);
  trimSilence(rawPath, trimmedPath);
  wordAudioCache.set(word, trimmedPath);
  return trimmedPath;
}

async function buildVerbClip(verbWords, outputPath) {
  const clips = [];
  for (let i = 0; i < verbWords.length; i++) {
    clips.push(await getTrimmedWordClip(verbWords[i]));
    clips.push(i < verbWords.length - 1 ? gapPath : tailPath);
  }
  concatFiles(clips, outputPath);
}

const manifest = {};

async function main() {
  let i = 0;
  const failures = [];
  for (const [text, info] of entries) {
    i++;
    const { slug, type } = info;
    const filename = `${slug}.mp3`;
    const filePath = path.join(outDir, filename);

    if (fs.existsSync(filePath)) {
      process.stdout.write(`[${i}/${entries.size}] (再利用) ${text}\n`);
      manifest[text] = { path: `${OUT_DIR_NAME}/${filename}`, type };
      continue;
    }

    process.stdout.write(`[${i}/${entries.size}] ${text}\n`);
    try {
      if (type === 'verb') {
        await buildVerbClip(info.verbWords, filePath);
      } else {
        // word/exampleは他の声(generate-audio.js)と同じく、生成した音声をそのまま保存する。
        // 以前ここでffmpegのsilenceremoveによる無音トリミングを行っていたが、
        // 文中のコンマ等の間を末尾の無音と誤認識して、そこで文章が切れてしまう
        // 不具合があったため廃止した。
        await synthesizeToFile(text, filePath);
      }
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
    `// 自動生成ファイル: scripts/generate-audio-chirp.js で作成 (声: ${VOICE_NAME})\n` +
      `// 動詞3活用は単語ごとに個別生成し、固定間隔(${GAP_MS}ms)で結合してテンポを統一している\n` +
      `window.${MANIFEST_VAR} = ${JSON.stringify(manifest, null, 2)};\n`
  );

  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log(`\n完了: ${entries.size - failures.length}/${entries.size} 件成功`);
  if (failures.length > 0) {
    console.log('失敗一覧:');
    failures.forEach((f) => console.log(`  - ${f.text}: ${f.error}`));
  }
}

main();
