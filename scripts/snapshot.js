const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '..');
const CHECK_MODE = process.argv.includes('--check');

const SKIP_DIRS = new Set(['node_modules', '.git', 'data']);
const SKIP_REL_PATH = 'backend/tests/history';
const SKIP_EXTS = new Set(['.db', '.db-journal', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svg', '.docx', '.xlsx', '.pdf', '.zip', '.tar', '.gz', '.map']);
const SKIP_FILENAMES = new Set(['package-lock.json', 'STRUCTURE.json']);

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir).sort();
  for (const entry of entries) {
    const absPath = path.join(dir, entry);
    const relPath = path.relative(REPO_ROOT, absPath).replace(/\\/g, '/');
    const stat = fs.statSync(absPath);

    if (stat.isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      if (relPath === SKIP_REL_PATH) continue;
      walk(absPath, files);
    } else {
      if (SKIP_FILENAMES.has(entry)) continue;
      if (SKIP_EXTS.has(path.extname(entry).toLowerCase())) continue;
      const content = fs.readFileSync(absPath);
      files.push({ path: relPath, size: stat.size, hash: sha256(content) });
    }
  }
  return files;
}

function buildTree(files) {
  const tree = {};
  for (const f of files) {
    const parts = f.path.split('/');
    let node = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      node[parts[i]] = node[parts[i]] || {};
      node = node[parts[i]];
    }
    node[parts[parts.length - 1]] = f.hash;
  }
  return tree;
}

function printTree(node, prefix = '', name = '') {
  if (name) process.stdout.write(prefix + name);
  if (typeof node === 'string') {
    process.stdout.write('  [' + node.slice(0, 8) + ']\n');
    return;
  }
  process.stdout.write(name ? '/\n' : '');
  const keys = Object.keys(node).sort();
  for (let i = 0; i < keys.length; i++) {
    const isLast = i === keys.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (name ? (isLast ? '    ' : '│   ') : '');
    printTree(node[keys[i]], childPrefix, connector + keys[i]);
  }
}

if (CHECK_MODE) {
  const structurePath = path.join(REPO_ROOT, 'STRUCTURE.json');
  if (!fs.existsSync(structurePath)) {
    console.error('STRUCTURE.json not found. Run without --check to generate it.');
    process.exit(1);
  }
  const saved = JSON.parse(fs.readFileSync(structurePath, 'utf8'));
  const files = walk(REPO_ROOT).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const treeChecksum = sha256(files.map(f => f.path + ':' + f.hash).join('\n'));
  if (treeChecksum === saved.tree_checksum) {
    console.log('OK: source tree matches STRUCTURE.json (checksum: ' + treeChecksum + ')');
    process.exit(0);
  } else {
    console.error('STALE: source tree does not match STRUCTURE.json');
    console.error('  expected: ' + saved.tree_checksum);
    console.error('  actual:   ' + treeChecksum);
    process.exit(1);
  }
}

const files = walk(REPO_ROOT).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
const treeChecksum = sha256(files.map(f => f.path + ':' + f.hash).join('\n'));

const structure = {
  generated_at: new Date().toISOString(),
  tree_checksum: treeChecksum,
  file_count: files.length,
  files,
};

fs.writeFileSync(path.join(REPO_ROOT, 'STRUCTURE.json'), JSON.stringify(structure, null, 2));

const tree = buildTree(files);
printTree(tree, '', '.');
console.log('\nFiles: ' + files.length);
console.log('Tree checksum: ' + treeChecksum);
