import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { join } from 'path'

// Read package.json to get the current version
const packageJsonPath = join(__dirname, '../package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
const version = packageJson.version
const tag = `v${version}`

console.log(`🚀 Starting release process for version ${version}...`)

try {
  // 1. Check if git status is clean
  const status = execSync('git status --porcelain').toString()
  if (status.trim()) {
    console.error('❌ Error: Git working directory is not clean. Please commit your changes first.')
    process.exit(1)
  }

  // 2. Check if tag already exists locally
  try {
    execSync(`git rev-parse ${tag}`, { stdio: 'ignore' })
    console.error(`❌ Error: Tag ${tag} already exists locally!`)
    console.log('👉 Tip: Update the "version" in package.json to a new number.')
    process.exit(1)
  } catch {
    // Tag doesn't exist, proceed
  }

  // 3. Create Tag
  console.log(`📦 Creating git tag: ${tag}`)
  execSync(`git tag ${tag}`, { stdio: 'inherit' })

  // 4. Push Tag
  console.log(`⬆️  Pushing tag to GitHub...`)
  execSync(`git push origin ${tag}`, { stdio: 'inherit' })

  console.log('')
  console.log('✅ SUCCESS! Release workflow triggered.')
  console.log('🔗 Check progress here: https://github.com/baranyalcinn/cafe-adisyon/actions')
} catch (error) {
  console.error('❌ Failed to execute release script:', error)
  process.exit(1)
}
