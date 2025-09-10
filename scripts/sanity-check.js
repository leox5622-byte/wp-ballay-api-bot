/*
 Static sanity check for commands: require each command file to surface syntax/import errors
 and validate that it exports a minimal shape: { config: { name }, onStart: function }
 Exits with non-zero if any failures are detected.
*/

const fs = require('fs');
const path = require('path');

// Provide a minimal global expected by some modules/loader
if (!global.DoraBot) {
  global.DoraBot = {
    configCommands: { commandUnload: [] },
    commands: new Map(),
    aliases: new Map(),
    commandFilesPath: [],
    envCommands: {},
    envEvents: {},
    envGlobal: {}
  };
}

function listCommandFiles(commandsDir) {
  const entries = fs.readdirSync(commandsDir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    if (e.isFile() && e.name.endsWith('.js')) files.push(path.join(commandsDir, e.name));
  }
  return files.sort();
}

function validateModule(mod, filePath) {
  const errors = [];
  if (!mod || typeof mod !== 'object') {
    errors.push('module.exports is not an object');
    return errors;
  }
  if (!mod.config || typeof mod.config !== 'object') {
    errors.push('missing config');
  } else if (!mod.config.name) {
    errors.push('missing config.name');
  }
  if (typeof mod.onStart !== 'function') {
    errors.push('missing onStart function');
  }
  return errors;
}

(function main() {
  const root = __dirname ? path.join(__dirname, '..') : process.cwd();
  const commandsDir = path.join(root, 'commands');
  if (!fs.existsSync(commandsDir)) {
    console.error('Commands directory not found at', commandsDir);
    process.exit(2);
  }

  const results = [];
  let ok = 0;
  let fail = 0;

  for (const filePath of listCommandFiles(commandsDir)) {
    const name = path.basename(filePath);
    try {
      // clear from cache to ensure fresh parse
      try { delete require.cache[require.resolve(filePath)]; } catch {}
      const mod = require(filePath);
      const errs = validateModule(mod, filePath);
      if (errs.length === 0) {
        console.log('[OK]', name);
        ok++;
      } else {
        console.log('[FAIL]', name, '-', errs.join('; '));
        results.push({ file: name, error: errs.join('; ') });
        fail++;
      }
    } catch (e) {
      const msg = (e && (e.stack || e.message)) || String(e);
      console.log('[FAIL]', name, '-', msg.split('\n')[0]);
      results.push({ file: name, error: msg });
      fail++;
    }
  }

  const summary = { ok, fail, total: ok + fail, results };
  console.log('Summary:', JSON.stringify(summary, null, 2));
  if (fail > 0) process.exit(1);
})();