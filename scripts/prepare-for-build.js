import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const nodeModulesPath = path.join(__dirname, '..', 'node_modules')
const packageJsonPath = path.join(__dirname, '..', 'package.json')

console.log('=== Preparing for electron-builder ===\n')

try {
  // Step 1: Remove ALL non-Windows native binaries from @libsql
  const libsqlPath = path.join(nodeModulesPath, '@libsql')
  if (fs.existsSync(libsqlPath)) {
    console.log('Step 1: Removing non-Windows @libsql binaries...')
    const entries = fs.readdirSync(libsqlPath)
    for (const entry of entries) {
      // Keep only win32-x64-msvc, remove everything else that's platform-specific
      if (
        entry.startsWith('darwin-') ||
        entry.startsWith('linux-') ||
        (entry.startsWith('win32-') && !entry.includes('x64'))
      ) {
        const fullPath = path.join(libsqlPath, entry)
        fs.rmSync(fullPath, { recursive: true, force: true })
        console.log(`  Removed: @libsql/${entry}`)
      }
    }
  } else {
    console.log('Step 1: @libsql not found in node_modules (optional dependency)')
  }

  // Step 2: Remove non-Windows @prisma engine binaries
  const prismaPath = path.join(nodeModulesPath, '@prisma')
  if (fs.existsSync(prismaPath)) {
    console.log('\nStep 2: Removing non-Windows @prisma binaries...')
    const entries = fs.readdirSync(prismaPath)
    for (const entry of entries) {
      if (
        entry.includes('darwin') ||
        entry.includes('linux') ||
        entry.includes('freebsd') ||
        entry.includes('arm')
      ) {
        const fullPath = path.join(prismaPath, entry)
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true })
          console.log(`  Removed: @prisma/${entry}`)
        }
      }
    }
  }

  // Step 3: Prune dev dependencies (MUST BE DONE BEFORE STRIPPING PACKAGE.JSON)
  console.log('\nStep 3: Running npm prune --omit=dev...')

  // BACKUP prisma-client-generated folder
  const generatedPrismaPath = path.join(nodeModulesPath, 'prisma-client-generated')
  const generatedPrismaBackup = path.join(__dirname, '..', 'prisma-client-generated-backup')

  if (fs.existsSync(generatedPrismaPath)) {
    console.log('  Backing up prisma-client-generated directory...')
    fs.cpSync(generatedPrismaPath, generatedPrismaBackup, { recursive: true })
  }

  try {
    execSync('npm prune --omit=dev', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
  } catch (error) {
    console.warn('  npm prune warning (continuing):', error.message)
  }

  // RESTORE prisma-client-generated folder
  if (fs.existsSync(generatedPrismaBackup)) {
    console.log('  Restoring prisma-client-generated directory...')
    if (!fs.existsSync(generatedPrismaPath)) {
      fs.mkdirSync(generatedPrismaPath, { recursive: true })
    }
    fs.cpSync(generatedPrismaBackup, generatedPrismaPath, { recursive: true })
    fs.rmSync(generatedPrismaBackup, { recursive: true, force: true })
  }

  // DEBUGGING: Verify @prisma/client and .prisma exist
  console.log('\n  --- DEBUG: Checking Prisma directories ---')
  const clientPath = path.join(nodeModulesPath, '@prisma', 'client')
  if (fs.existsSync(clientPath)) {
    console.log(`  [OK] @prisma/client exists.`)
    // List client folder
    try {
      console.log('  @prisma/client contents:', fs.readdirSync(clientPath).slice(0, 5))
    } catch {
      console.log('  (Unable to list @prisma/client contents)')
    }
  } else {
    console.error(`  [ERROR] @prisma/client MISSING!`)
  }

  if (fs.existsSync(generatedPrismaPath)) {
    console.log(`  [OK] prisma-client-generated exists.`)
    try {
      // Check for contents
      console.log(
        '  prisma-client-generated contents:',
        fs.readdirSync(generatedPrismaPath).slice(0, 5)
      )
    } catch {
      console.log('  (Unable to list prisma-client-generated contents)')
    }
  } else {
    console.error(`  [ERROR] prisma-client-generated MISSING!`)
  }

  // Step 4: CRITICAL - Strip dependencies from package.json to prevent electron-builder scanning
  console.log('\nStep 4: Stripping dependencies from package.json...')
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

  // Backup
  fs.writeFileSync(packageJsonPath + '.bak', JSON.stringify(packageJson, null, 2))

  // Remove ALL dependency fields - electron-builder will use actual node_modules content
  delete packageJson.dependencies
  delete packageJson.devDependencies
  delete packageJson.optionalDependencies
  delete packageJson.peerDependencies

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
  console.log('  Stripped all dependency fields from package.json')

  console.log('\n=== Preparation complete! Ready for electron-builder ===')
} catch (error) {
  console.error('Error during preparation:', error)
  process.exit(1)
}
