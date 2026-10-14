// Prepares a DSH_HOME for the AiST desktop app: profile "web" with the AiST plugins and the
// profile patch (base + proxy-managed provider block). Idempotent; runs on every start.
const { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, cpSync, readdirSync } = require('node:fs');
const { join } = require('node:path');

const PLUGINS = {
  'aist-brand': 'dsh-client-ui-brand-aist',
  'aist-locale-ru': 'dsh-client-locale-ru',
  'aist-settings-assistant': 'dsh-client-ui-settings-aist',
};

/**
 * @param {string} dshHome   target DSH_HOME
 * @param {string} assetsDir folder holding plugins/* and cordis.patch.yml (the repo's dsh/ folder)
 * @param {string} version   app version; plugins are re-copied when it changes
 */
function prepareDshHome(dshHome, assetsDir, version) {
  const profile = join(dshHome, 'profiles', 'web');
  mkdirSync(join(profile, 'plugins'), { recursive: true });
  mkdirSync(join(profile, 'node_modules'), { recursive: true });
  const stamp = join(profile, '.aist-plugins-version');
  const current = existsSync(stamp) ? readFileSync(stamp, 'utf8').trim() : '';
  if (current !== version || !readdirSync(join(profile, 'plugins')).length) {
    for (const [dir, pkg] of Object.entries(PLUGINS)) {
      // Real copies, no symlinks: works on Windows without privileges and inside packaged apps.
      for (const target of [join(profile, 'plugins', dir), join(profile, 'node_modules', pkg)]) {
        rmSync(target, { recursive: true, force: true });
        cpSync(join(assetsDir, 'plugins', dir), target, { recursive: true });
      }
    }
    writeFileSync(stamp, version);
  }
  // Install the patch template once; afterwards the proxy keeps the provider block in sync and
  // Harness itself may append user preferences, so never overwrite an existing file.
  const patch = join(profile, 'cordis.patch.yml');
  if (!existsSync(patch)) writeFileSync(patch, readFileSync(join(assetsDir, 'cordis.patch.yml'), 'utf8'));
  return { profile, patch };
}

module.exports = { prepareDshHome, PLUGINS };
