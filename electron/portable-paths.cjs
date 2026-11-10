const path = require('node:path');
const fs = require('node:fs');

// Called before reading app_config.json or creating any BrowserWindow.
// Keep each extracted copy independent of installed/previous versions.
function configurePortablePaths(app, execPath = process.execPath, env = process.env) {
  if (!app.isPackaged) return null;
  // Also keep data out of the temporary EXE directory if a developer explicitly
  // chooses electron-builder's legacy single-file portable target.
  const root = env.PORTABLE_EXECUTABLE_DIR || path.dirname(execPath);
  const profile = path.join(root, 'portable-profile');
  fs.mkdirSync(profile, { recursive: true });
  fs.accessSync(profile, fs.constants.W_OK);
  app.setPath('userData', profile);
  app.setPath('sessionData', profile);
  return root;
}

module.exports = { configurePortablePaths };
