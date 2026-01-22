import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const packageJsonPath = path.join(__dirname, '..', 'package.json')

try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

  // Backup original just in case (though CI environment is ephemeral)
  fs.writeFileSync(packageJsonPath + '.bak', JSON.stringify(packageJson, null, 2))

  console.log('Original package.json backed up to package.json.bak')
  console.log('Removing dependencies from package.json to prevent electron-builder scanning...')

  // CRITICAL: Keep dependencies and optionalDependencies so electron-builder packs them!
  // delete packageJson.dependencies
  // delete packageJson.optionalDependencies
  delete packageJson.devDependencies // Only remove devDependencies to save memory

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
  console.log('Successfully stripped dependencies from package.json')

  // Remove non-Windows @libsql platform binaries to prevent memory exhaustion
  const libsqlPath = path.join(__dirname, '..', 'node_modules', '@libsql')
  if (fs.existsSync(libsqlPath)) {
    console.log('Removing non-Windows @libsql platform binaries...')
    const entries = fs.readdirSync(libsqlPath)
    for (const entry of entries) {
      if (entry.startsWith('darwin-') || entry.startsWith('linux-')) {
        const fullPath = path.join(libsqlPath, entry)
        fs.rmSync(fullPath, { recursive: true, force: true })
        console.log(`  Removed: @libsql/${entry}`)
      }
    }
  }

  console.log('Running npm prune --production to physically remove devDependencies...')
  execSync('npm prune --production', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
  console.log('Pruning complete.')
} catch (error) {
  console.error('Error processing package.json:', error)
  process.exit(1)
}
