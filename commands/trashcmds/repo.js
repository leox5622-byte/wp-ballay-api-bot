const fs = require('fs');
const fsExtra = require('fs-extra');
const path = require('path');
const { spawnSync } = require('child_process');

// Helpers
const repoRoot = path.resolve(__dirname, '..');
const allowedDirs = [
  path.join(repoRoot, 'commands'),
  path.join(repoRoot, 'scripts'),
  path.join(repoRoot, 'events'),
  path.join(repoRoot, 'models'),
  path.join(repoRoot, 'data')
].map(p => path.resolve(p));

function isPathAllowed(targetAbsPath) {
  const normalized = path.resolve(targetAbsPath);
  return allowedDirs.some(base => normalized.startsWith(base + path.sep) || normalized === base);
}

function resolveTarget(userInputPath) {
  const abs = path.resolve(repoRoot, userInputPath);
  if (!isPathAllowed(abs)) {
    throw new Error('Access denied: Path is outside of allowed directories.');
  }
  return abs;
}

function runGit(args) {
  const res = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf-8',
    shell: false
  });
  return res;
}

function formatList(items) {
  return items.map(it => `${it.isDir ? '📁' : '📄'} ${it.name}`).join('\n');
}

module.exports = {
  config: {
    name: 'repo',
    aliases: ['repository', 'git'],
    version: '1.0.0',
    author: 'Trae AI',
    coolDown: 3,
    role: 2, // Bot Owner only
    description: 'Securely manage repository files and commits from chat',
    category: 'system',
    guide: ({ prefix, commandName }) =>
      [
        `${prefix}${commandName} list [dir] - List files in allowed directories or inside dir`,
        `${prefix}${commandName} view <path> - View a file (first 1800 chars)`,
        `${prefix}${commandName} add <path> <content> - Create a new file with content (or reply with quoted text)`,
        `${prefix}${commandName} edit <path> <content> - Overwrite a file with content (or reply with quoted text)`,
        `${prefix}${commandName} status - Show git status`,
        `${prefix}${commandName} commit <message> - Commit staged changes with message`
      ].join('\n')
  },

  onStart: async function({ message, args, prefix }) {
    try {
      if (!args.length) return message.SyntaxError();
      const sub = String(args.shift()).toLowerCase();

      if (sub === 'list') {
        // list [dir]
        const maybeDir = args.join(' ').trim();
        if (!maybeDir) {
          // list roots
          const roots = allowedDirs.map(d => path.relative(repoRoot, d));
          return message.reply(`Allowed roots:\n${roots.map(r => `📁 ${r}`).join('\n')}`);
        }
        let absDir;
        try { absDir = resolveTarget(maybeDir); } catch (e) { return message.reply(`❌ ${e.message}`); }
        if (!fs.existsSync(absDir)) return message.reply('❌ Path does not exist.');
        if (!fs.statSync(absDir).isDirectory()) return message.reply('❌ Provided path is not a directory.');
        const names = await fs.promises.readdir(absDir);
        const items = await Promise.all(names.map(async name => {
          const p = path.join(absDir, name);
          const st = await fs.promises.stat(p);
          return { name: path.relative(repoRoot, p), isDir: st.isDirectory() };
        }));
        return message.reply(formatList(items) || '∅ Empty directory.');
      }

      if (sub === 'view') {
        // view <path>
        const filePath = args.join(' ').trim();
        if (!filePath) return message.SyntaxError('Usage: view <path>');
        let abs;
        try { abs = resolveTarget(filePath); } catch (e) { return message.reply(`❌ ${e.message}`); }
        if (!fs.existsSync(abs)) return message.reply('❌ File not found.');
        if (!fs.statSync(abs).isFile()) return message.reply('❌ Not a file.');
        const content = await fs.promises.readFile(abs, 'utf-8');
        const rel = path.relative(repoRoot, abs);
        const max = 1800;
        const truncated = content.length > max ? `${content.slice(0, max)}\n... [truncated ${content.length - max} chars]` : content;
        return message.reply(`Path: ${rel}\n-----\n${truncated}`);
      }

      if (sub === 'add' || sub === 'edit') {
        // add|edit <path> <content | from quoted>
        if (args.length === 0) return message.SyntaxError(`Usage: ${sub} <path> <content | reply with quoted>`);
        const targetRel = args.shift();
        let abs;
        try { abs = resolveTarget(targetRel); } catch (e) { return message.reply(`❌ ${e.message}`); }

        let content = args.join(' ').trim();
        if (!content && message.hasQuotedMsg) {
          const quoted = await message.getQuotedMessage();
          content = quoted?.body || '';
        }
        if (!content) return message.reply('❌ No content provided. Provide text after the path or reply to a text message.');

        // Ensure parent dir exists
        await fsExtra.ensureDir(path.dirname(abs));

        if (sub === 'add' && fs.existsSync(abs)) {
          return message.reply('❌ File already exists. Use edit to overwrite.');
        }
        if (sub === 'edit' && !fs.existsSync(abs)) {
          return message.reply('❌ File does not exist. Use add to create.');
        }

        await fs.promises.writeFile(abs, content, 'utf-8');

        // Stage the file
        const rel = path.relative(repoRoot, abs).replace(/\\/g, '/');
        const addRes = runGit(['add', '--', rel]);
        if (addRes.error) {
          return message.reply(`⚠️ File saved, but git add failed: ${addRes.error.message}`);
        }
        if (addRes.status !== 0) {
          return message.reply(`⚠️ File saved, but git add failed with code ${addRes.status}: ${addRes.stderr || addRes.stdout}`);
        }

        const bytes = Buffer.byteLength(content, 'utf-8');
        return message.reply(`✅ ${sub === 'add' ? 'Created' : 'Updated'} ${rel} (${bytes} bytes) and staged for commit.`);
      }

      if (sub === 'status') {
        const res = runGit(['status', '--short', '--branch']);
        if (res.error) return message.reply(`❌ git error: ${res.error.message}`);
        const out = (res.stdout || res.stderr || '').trim();
        return message.reply(out ? out : 'Clean working tree.');
      }

      if (sub === 'commit') {
        const msg = args.join(' ').trim();
        if (!msg) return message.SyntaxError('Usage: commit <message>');

        // Ensure there is something to commit
        const st = runGit(['status', '--porcelain']);
        if (st.error) return message.reply(`❌ git error: ${st.error.message}`);
        if (!st.stdout || !st.stdout.trim()) return message.reply('ℹ️ No staged changes to commit. Add/edit files first.');

        const res = runGit(['commit', '-m', msg]);
        if (res.error) return message.reply(`❌ git error: ${res.error.message}`);
        if (res.status !== 0) return message.reply(`❌ git commit failed: ${res.stderr || res.stdout}`);
        return message.reply(`✅ Commit created:\n${res.stdout.trim()}`);
      }

      return message.SyntaxError();
    } catch (err) {
      return message.reply(`❌ ${err.message}`);
    }
  }
};