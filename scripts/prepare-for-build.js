const fs = require('fs')
const path = require('path')

const packageJsonPath = path.join(__dirname, '..', 'package.json')

try {
  const packageJson = require(packageJsonPath)

  // Backup original just in case (though CI environment is ephemeral)
  fs.writeFileSync(packageJsonPath + '.bak', JSON.stringify(packageJson, null, 2))

  console.log('Original package.json backed up to package.json.bak')
  console.log('Removing dependencies from package.json to prevent electron-builder scanning...')

  // Remove dependencies to prevent electron-builder from scanning them
  delete packageJson.dependencies
  delete packageJson.optionalDependencies
  delete packageJson.devDependencies // Also remove devDependencies to be safe

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
  console.log('Successfully stripped dependencies from package.json')
} catch (error) {
  console.error('Error processing package.json:', error)
  process.exit(1)
}
