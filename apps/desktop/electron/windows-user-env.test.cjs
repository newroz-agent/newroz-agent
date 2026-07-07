const assert = require('node:assert/strict')
const { test } = require('node:test')

const { expandWindowsEnvRefs, parseRegQueryValue, readWindowsUserEnvVar } = require('./windows-user-env.cjs')

// ── parseRegQueryValue ─────────────────────────────────────────────────────

test('parseRegQueryValue extracts a REG_SZ value', () => {
  const out = ['', 'HKEY_CURRENT_USER\\Environment', '    NEWROZ_HOME    REG_SZ    F:\\Newroz\\data', ''].join('\r\n')
  assert.equal(parseRegQueryValue(out, 'NEWROZ_HOME'), 'F:\\Newroz\\data')
})

test('parseRegQueryValue matches the name case-insensitively', () => {
  const out = 'HKEY_CURRENT_USER\\Environment\r\n    Newroz_Home    REG_EXPAND_SZ    %USERPROFILE%\\h\r\n'
  assert.equal(parseRegQueryValue(out, 'NEWROZ_HOME'), '%USERPROFILE%\\h')
})

test('parseRegQueryValue preserves spaces inside the value', () => {
  const out = '    NEWROZ_HOME    REG_SZ    C:\\Program Files\\Newroz\r\n'
  assert.equal(parseRegQueryValue(out, 'NEWROZ_HOME'), 'C:\\Program Files\\Newroz')
})

test('parseRegQueryValue returns null when the value line is absent', () => {
  const out = 'HKEY_CURRENT_USER\\Environment\r\n    Path    REG_SZ    C:\\x\r\n'
  assert.equal(parseRegQueryValue(out, 'NEWROZ_HOME'), null)
  assert.equal(parseRegQueryValue('', 'NEWROZ_HOME'), null)
  assert.equal(parseRegQueryValue('garbage', 'NEWROZ_HOME'), null)
})

// ── expandWindowsEnvRefs ───────────────────────────────────────────────────

test('expandWindowsEnvRefs expands %VAR% case-insensitively', () => {
  assert.equal(expandWindowsEnvRefs('%UserProfile%\\h', { USERPROFILE: 'C:\\Users\\jeff' }), 'C:\\Users\\jeff\\h')
})

test('expandWindowsEnvRefs leaves literal paths and unknown refs intact', () => {
  assert.equal(expandWindowsEnvRefs('F:\\Newroz\\data', {}), 'F:\\Newroz\\data')
  assert.equal(expandWindowsEnvRefs('%NOPE%\\x', {}), '%NOPE%\\x')
})

// ── readWindowsUserEnvVar ──────────────────────────────────────────────────

test('readWindowsUserEnvVar returns null off Windows without spawning', () => {
  let spawned = false
  const exec = () => {
    spawned = true
    return ''
  }
  assert.equal(readWindowsUserEnvVar('NEWROZ_HOME', { platform: 'linux', exec }), null)
  assert.equal(spawned, false)
})

test('readWindowsUserEnvVar queries HKCU\\Environment and expands the value', () => {
  const calls = []
  const exec = (cmd, args) => {
    calls.push([cmd, args])
    return 'HKEY_CURRENT_USER\\Environment\r\n    NEWROZ_HOME    REG_EXPAND_SZ    %DRIVE%\\Newroz\r\n'
  }
  const value = readWindowsUserEnvVar('NEWROZ_HOME', {
    platform: 'win32',
    env: { DRIVE: 'F:' },
    exec
  })
  assert.equal(value, 'F:\\Newroz')
  assert.deepEqual(calls, [['reg', ['query', 'HKCU\\Environment', '/v', 'NEWROZ_HOME']]])
})

test('readWindowsUserEnvVar returns null when reg exits non-zero (value missing)', () => {
  const exec = () => {
    throw new Error('reg exited 1')
  }
  assert.equal(readWindowsUserEnvVar('NEWROZ_HOME', { platform: 'win32', exec }), null)
})

test('readWindowsUserEnvVar returns null for an empty value', () => {
  const exec = () => '    NEWROZ_HOME    REG_SZ    \r\n'
  assert.equal(readWindowsUserEnvVar('NEWROZ_HOME', { platform: 'win32', exec }), null)
})
