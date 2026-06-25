/**
 * 시스템 표기법 완전 정규화 스크립트
 *
 * 변환 규칙:
 *   (1) f/r 포함: \b([1-6])C_([fr])\b → C$1_$2
 *   (2) f/r 없음: \b([1-6])C\b → C$1 (1C→C1, 2C→C2 등)
 *
 * 대상: systems 하위 모든 .json 파일
 *
 * 사용법: node convert-system-notation.js [systems경로]
 * 기본 경로: D:\3Cushion AI\frontend\src\data\systems
 */

const fs = require('fs');
const path = require('path');

// (1) f/r 포함: 1C_f→C1_f, 2C_r→C2_r
const PATTERN_A = /\b([1-6])C_([fr])\b/g;
const REPLACEMENT_A = 'C$1_$2';

// (2) f/r 없음: 1C→C1, 2C→C2 (반드시 (1) 이후 적용 - 순서 중요)
const PATTERN_B = /\b([1-6])C\b/g;
const REPLACEMENT_B = 'C$1';

const DEFAULT_PATH = 'D:\\3Cushion AI\\frontend\\src\\data\\systems';

function getAllJsonFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }
  return results;
}

function convertFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let count = 0;

  // (1) f/r 포함 먼저
  const matchesA = content.match(PATTERN_A);
  if (matchesA) {
    content = content.replace(PATTERN_A, REPLACEMENT_A);
    count += matchesA.length;
  }

  // (2) f/r 없는 형태
  const matchesB = content.match(PATTERN_B);
  if (matchesB) {
    content = content.replace(PATTERN_B, REPLACEMENT_B);
    count += matchesB.length;
  }

  if (count === 0) return { changed: false, count: 0 };

  fs.writeFileSync(filePath, content, 'utf8');
  return { changed: true, count };
}

function verifyNoOldNotation(dir) {
  // 잔여 \b[1-6]C\b 패턴 검사 (1C, 2C 등)
  const verifyPattern = /\b[1-6]C\b/g;
  const found = [];

  for (const file of getAllJsonFiles(dir)) {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(verifyPattern);
    if (matches) {
      found.push({ file, matches: [...new Set(matches)] });
    }
  }

  return found;
}

function validateJsonFiles(dir) {
  const errors = [];
  for (const file of getAllJsonFiles(dir)) {
    try {
      const content = fs.readFileSync(file, 'utf8');
      JSON.parse(content);
    } catch (e) {
      errors.push({ file, message: e.message });
    }
  }
  return errors;
}

function main() {
  const systemsPath = process.argv[2]
    ? path.resolve(process.argv[2])
    : path.resolve(DEFAULT_PATH);

  console.log('📂 대상 경로:', systemsPath);

  if (!fs.existsSync(systemsPath)) {
    console.error('❌ 경로가 존재하지 않습니다.');
    console.log('   사용법: node convert-system-notation.js [systems경로]');
    process.exit(1);
  }

  const files = getAllJsonFiles(systemsPath);
  console.log(`📄 발견된 파일: ${files.length}개`);

  let totalReplaced = 0;
  const changedFiles = [];

  for (const file of files) {
    const relPath = path.relative(systemsPath, file);
    const result = convertFile(file);
    
    if (result.changed) {
      totalReplaced += result.count;
      changedFiles.push({ path: relPath, count: result.count });
    }
  }

  // 총 치환 개수
  console.log('\n' + '─'.repeat(40));
  console.log(`📊 총 치환 개수: ${totalReplaced}`);
  if (changedFiles.length > 0) {
    changedFiles.forEach(({ path: p, count }) => {
      console.log(`   - ${p}: ${count}개`);
    });
  }

  // 검증 1: 잔여 구 표기 \b[1-6]C\b 확인
  const remaining = verifyNoOldNotation(systemsPath);
  const hasRemaining = remaining.length > 0;
  console.log('\n🔍 잔여 구 표기 존재 여부:', hasRemaining ? '있음 ❌' : '없음 ✅');
  if (hasRemaining) {
    remaining.forEach(({ file, matches }) => {
      console.log(`   ${file}: ${matches.join(', ')}`);
    });
    process.exit(1);
  }

  // 검증 2: JSON 파싱 검사
  const parseErrors = validateJsonFiles(systemsPath);
  if (parseErrors.length > 0) {
    console.log('\n❌ JSON 파싱 오류:');
    parseErrors.forEach(({ file, message }) => {
      console.log(`   ${file}: ${message}`);
    });
    process.exit(1);
  }
  console.log('✅ JSON.parse 정상');
}

main();
