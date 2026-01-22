import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

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
} catch (error) {
  console.error('Error processing package.json:', error)
  process.exit(1)
}
