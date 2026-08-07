module.exports = {
  cli: {
    name: 'set-dev-environment',
    description: 'Set the environment in development mode (enable monorepo dependencies symlinks)',
    version: '0.1',
    arguments: [],
  },
  run: async () => {
    const path = require('path')
    const fs = require('fs')
    const shellJs = require('shelljs')
    const leappCoreBootstrap = require('./leapp-core-bootstrap')
    const packageNames = ['desktop-app', 'cli']
    const currentPath = shellJs.pwd()

    try {
      // Ensure the local dpapi-addon has its own dependencies (nan, bindings) installed.
      // @electron/rebuild runs node-gyp with the dpapi-addon folder as the working directory,
      // so binding.gyp's `require('nan')` must resolve from dpapi-addon/node_modules. The
      // file:../../dpapi-addon dependency only hoists nan into desktop-app/node_modules, which
      // node-gyp cannot see. --ignore-scripts skips a redundant node-gyp build here; the real
      // Electron rebuild happens later via the desktop-app postinstall.
      const dpapiAddonPath = path.join(__dirname, '..', 'dpapi-addon')
      if (fs.existsSync(path.join(dpapiAddonPath, 'package.json'))) {
        console.log('installing dpapi-addon dependencies (nan, bindings)...')
        shellJs.cd(dpapiAddonPath)
        const result = shellJs.exec('npm install --ignore-scripts')
        if (result.code !== 0) {
          throw new Error(result.stderr)
        }
      }

      for (const packageName of packageNames) {
        console.log(`enabling monorepo dependencies symlinks for ${packageName}...`)
        await leappCoreBootstrap(packageName, () => 'file:../core');
      }
    } catch (e) {
      e.message = e.stack.red
      throw e
    } finally {
      shellJs.cd(currentPath)
    }
  },
}
