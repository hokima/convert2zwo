/**
 * Dev launcher - properly removes ELECTRON_RUN_AS_NODE before starting
 * (cross-env sets it to "" which still triggers Electron's Node mode check)
 * Also kills the entire process tree on exit so the app can be restarted cleanly.
 */
const { spawn, execSync } = require('child_process')

const env = { ...process.env }
delete env['ELECTRON_RUN_AS_NODE']
delete env['ELECTRON_OVERRIDE_DIST_PATH']

const child = spawn('npx', ['electron-vite', 'dev'], {
  env,
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
})

function killChild() {
  if (!child.pid) return
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /F /T /PID ${child.pid}`, { stdio: 'ignore' })
    } else {
      process.kill(-child.pid, 'SIGTERM')
    }
  } catch (_) {}
}

process.on('SIGINT', () => { killChild(); process.exit(0) })
process.on('SIGTERM', () => { killChild(); process.exit(0) })
process.on('exit', killChild)

child.on('exit', (code) => process.exit(code ?? 0))
