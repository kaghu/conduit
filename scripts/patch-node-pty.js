// node-pty enables Spectre mitigation in its gyp files on Windows, which requires
// MSVC Spectre-mitigated libraries (MSB8040) that many VS installs lack.
// Disable it so native modules compile with a standard C++ workload.
const fs = require('fs')
const path = require('path')

if (process.platform !== 'win32') {
  process.exit(0)
}

const files = [
  path.join(__dirname, '..', 'node_modules', 'node-pty', 'binding.gyp'),
  path.join(__dirname, '..', 'node_modules', 'node-pty', 'deps', 'winpty', 'src', 'winpty.gyp')
]

let patchedAny = false

for (const file of files) {
  if (!fs.existsSync(file)) continue
  const original = fs.readFileSync(file, 'utf8')
  const patched = original.replaceAll("'SpectreMitigation': 'Spectre'", "'SpectreMitigation': 'false'")
  if (patched !== original) {
    fs.writeFileSync(file, patched)
    patchedAny = true
    console.log(`patched ${path.relative(process.cwd(), file)}`)
  }
}

if (!patchedAny) {
  const missing = files.filter((file) => !fs.existsSync(file))
  if (missing.length === files.length) {
    console.warn('node-pty not installed yet; skipping Windows native patch')
  }
}
