const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { configurePortablePaths } = require('../electron/portable-paths.cjs');

function withTemp(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'roco-portable-'));
  try { fn(dir); } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
function fakeApp(packaged = true) {
  return { isPackaged: packaged, paths: {}, setPath(name, value) { this.paths[name] = value; } };
}
test('folder portable stores profile beside EXE and survives reinitialization', () => withTemp(dir => {
  const app = fakeApp();
  assert.equal(configurePortablePaths(app, path.join(dir, 'app.exe'), {}), dir);
  const expected = path.join(dir, 'portable-profile');
  assert.deepEqual(app.paths, { userData: expected, sessionData: expected });
  const config = path.join(expected, 'app_config.json');
  fs.writeFileSync(config, '{"marker":"preserve"}');
  configurePortablePaths(fakeApp(), path.join(dir, 'app.exe'), {});
  assert.equal(fs.readFileSync(config, 'utf8'), '{"marker":"preserve"}');
}));
test('separate copies have isolated profiles', () => withTemp(dir => {
  const a = fakeApp(), b = fakeApp();
  configurePortablePaths(a, path.join(dir, 'one', 'app.exe'), {});
  configurePortablePaths(b, path.join(dir, 'two', 'app.exe'), {});
  assert.notEqual(a.paths.userData, b.paths.userData);
}));
test('legacy portable launch uses persistent outer directory instead of temp EXE', () => withTemp(dir => {
  const app = fakeApp();
  const outer = path.join(dir, 'original');
  assert.equal(configurePortablePaths(app, path.join(dir, 'temp', 'app.exe'), { PORTABLE_EXECUTABLE_DIR: outer }), outer);
  assert.equal(app.paths.userData, path.join(outer, 'portable-profile'));
  assert.equal(fs.existsSync(path.join(dir, 'temp')), false);
}));
test('development preserves existing Electron profile selection', () => {
  const app = fakeApp(false);
  assert.equal(configurePortablePaths(app, 'unused', {}), null);
  assert.deepEqual(app.paths, {});
});
test('invalid profile directory fails instead of falling back to shared old data', () => withTemp(dir => {
  fs.writeFileSync(path.join(dir, 'portable-profile'), 'not a directory');
  assert.throws(() => configurePortablePaths(fakeApp(), path.join(dir, 'app.exe'), {}));
}));
test('default packaging uses folder ZIP and includes portable path module', () => {
  const config = require('../package.json');
  assert.deepEqual(config.build.win.target, ['zip']);
  assert.ok(config.build.files.includes('electron/**/*'));
  assert.match(config.scripts['electron:build:dir'], /--dir/);
});
test('local warehouse, profiles, snapshots, captures and delivery volumes are ignored', () => {
  const files = ['roco_egg_data.json', 'data/roco_egg_data.json', 'portable-profile/app_config.json',
    'data-candidates/test.json', 'database-backups/test.json', 'raw-captures/sample.json',
    'test.pcapng', 'deliverables/RocoEggMaster.zip.001', 'RocoEggMaster.zip.001'];
  const result = execFileSync('git', ['check-ignore', '--no-index', '--stdin'], { input: files.join('\n') + '\n', encoding: 'utf8' });
  assert.deepEqual(result.trim().split(/\r?\n/), files);
});
