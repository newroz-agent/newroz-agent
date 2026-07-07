const { contextBridge, ipcRenderer, webUtils } = require('electron')

contextBridge.exposeInMainWorld('newrozDesktop', {
  getConnection: profile => ipcRenderer.invoke('newroz:connection', profile),
  revalidateConnection: () => ipcRenderer.invoke('newroz:connection:revalidate'),
  touchBackend: profile => ipcRenderer.invoke('newroz:backend:touch', profile),
  getGatewayWsUrl: profile => ipcRenderer.invoke('newroz:gateway:ws-url', profile),
  openSessionWindow: (sessionId, opts) => ipcRenderer.invoke('newroz:window:openSession', sessionId, opts),
  openNewSessionWindow: () => ipcRenderer.invoke('newroz:window:openNewSession'),
  petOverlay: {
    // Main renderer → main process: window lifecycle + drag. `request` is
    // `{ bounds, screen }`; resolves with the screen bounds it actually used.
    open: request => ipcRenderer.invoke('newroz:pet-overlay:open', request),
    close: () => ipcRenderer.invoke('newroz:pet-overlay:close'),
    setBounds: bounds => ipcRenderer.send('newroz:pet-overlay:set-bounds', bounds),
    setIgnoreMouse: ignore => ipcRenderer.send('newroz:pet-overlay:ignore-mouse', ignore),
    // Flip the overlay focusable (and focus it) while the composer needs keys.
    setFocusable: focusable => ipcRenderer.send('newroz:pet-overlay:set-focusable', focusable),
    // Main renderer → overlay (forwarded by main): push the latest pet state.
    pushState: payload => ipcRenderer.send('newroz:pet-overlay:state', payload),
    // Overlay → main renderer (forwarded by main): pop back in / composer submit.
    control: payload => ipcRenderer.send('newroz:pet-overlay:control', payload),
    // Overlay subscribes to state pushes.
    onState: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('newroz:pet-overlay:state', listener)
      return () => ipcRenderer.removeListener('newroz:pet-overlay:state', listener)
    },
    // Main renderer subscribes to overlay control messages.
    onControl: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('newroz:pet-overlay:control', listener)
      return () => ipcRenderer.removeListener('newroz:pet-overlay:control', listener)
    }
  },
  getBootProgress: () => ipcRenderer.invoke('newroz:boot-progress:get'),
  getConnectionConfig: profile => ipcRenderer.invoke('newroz:connection-config:get', profile),
  saveConnectionConfig: payload => ipcRenderer.invoke('newroz:connection-config:save', payload),
  applyConnectionConfig: payload => ipcRenderer.invoke('newroz:connection-config:apply', payload),
  testConnectionConfig: payload => ipcRenderer.invoke('newroz:connection-config:test', payload),
  probeConnectionConfig: remoteUrl => ipcRenderer.invoke('newroz:connection-config:probe', remoteUrl),
  oauthLoginConnectionConfig: remoteUrl => ipcRenderer.invoke('newroz:connection-config:oauth-login', remoteUrl),
  oauthLogoutConnectionConfig: remoteUrl => ipcRenderer.invoke('newroz:connection-config:oauth-logout', remoteUrl),
  profile: {
    get: () => ipcRenderer.invoke('newroz:profile:get'),
    set: name => ipcRenderer.invoke('newroz:profile:set', name)
  },
  api: request => ipcRenderer.invoke('newroz:api', request),
  notify: payload => ipcRenderer.invoke('newroz:notify', payload),
  requestMicrophoneAccess: () => ipcRenderer.invoke('newroz:requestMicrophoneAccess'),
  readFileDataUrl: filePath => ipcRenderer.invoke('newroz:readFileDataUrl', filePath),
  readFileText: filePath => ipcRenderer.invoke('newroz:readFileText', filePath),
  selectPaths: options => ipcRenderer.invoke('newroz:selectPaths', options),
  writeClipboard: text => ipcRenderer.invoke('newroz:writeClipboard', text),
  saveImageFromUrl: url => ipcRenderer.invoke('newroz:saveImageFromUrl', url),
  saveImageBuffer: (data, ext) => ipcRenderer.invoke('newroz:saveImageBuffer', { data, ext }),
  saveClipboardImage: () => ipcRenderer.invoke('newroz:saveClipboardImage'),
  getPathForFile: file => {
    try {
      return webUtils.getPathForFile(file) || ''
    } catch {
      return ''
    }
  },
  normalizePreviewTarget: (target, baseDir) => ipcRenderer.invoke('newroz:normalizePreviewTarget', target, baseDir),
  watchPreviewFile: url => ipcRenderer.invoke('newroz:watchPreviewFile', url),
  stopPreviewFileWatch: id => ipcRenderer.invoke('newroz:stopPreviewFileWatch', id),
  setTitleBarTheme: payload => ipcRenderer.send('newroz:titlebar-theme', payload),
  setNativeTheme: mode => ipcRenderer.send('newroz:native-theme', mode),
  setTranslucency: payload => ipcRenderer.send('newroz:translucency', payload),
  setPreviewShortcutActive: active => ipcRenderer.send('newroz:previewShortcutActive', Boolean(active)),
  openExternal: url => ipcRenderer.invoke('newroz:openExternal', url),
  openPreviewInBrowser: url => ipcRenderer.invoke('newroz:openPreviewInBrowser', url),
  fetchLinkTitle: url => ipcRenderer.invoke('newroz:fetchLinkTitle', url),
  sanitizeWorkspaceCwd: cwd => ipcRenderer.invoke('newroz:workspace:sanitize', cwd),
  settings: {
    getDefaultProjectDir: () => ipcRenderer.invoke('newroz:setting:defaultProjectDir:get'),
    setDefaultProjectDir: dir => ipcRenderer.invoke('newroz:setting:defaultProjectDir:set', dir),
    pickDefaultProjectDir: () => ipcRenderer.invoke('newroz:setting:defaultProjectDir:pick')
  },
  revealLogs: () => ipcRenderer.invoke('newroz:logs:reveal'),
  getRecentLogs: () => ipcRenderer.invoke('newroz:logs:recent'),
  readDir: dirPath => ipcRenderer.invoke('newroz:fs:readDir', dirPath),
  gitRoot: startPath => ipcRenderer.invoke('newroz:fs:gitRoot', startPath),
  revealPath: targetPath => ipcRenderer.invoke('newroz:fs:reveal', targetPath),
  renamePath: (targetPath, newName) => ipcRenderer.invoke('newroz:fs:rename', targetPath, newName),
  writeTextFile: (filePath, content) => ipcRenderer.invoke('newroz:fs:writeText', filePath, content),
  trashPath: targetPath => ipcRenderer.invoke('newroz:fs:trash', targetPath),
  git: {
    worktreeList: repoPath => ipcRenderer.invoke('newroz:git:worktreeList', repoPath),
    worktreeAdd: (repoPath, options) => ipcRenderer.invoke('newroz:git:worktreeAdd', repoPath, options),
    worktreeRemove: (repoPath, worktreePath, options) =>
      ipcRenderer.invoke('newroz:git:worktreeRemove', repoPath, worktreePath, options),
    branchSwitch: (repoPath, branch) => ipcRenderer.invoke('newroz:git:branchSwitch', repoPath, branch),
    branchList: repoPath => ipcRenderer.invoke('newroz:git:branchList', repoPath),
    repoStatus: repoPath => ipcRenderer.invoke('newroz:git:repoStatus', repoPath),
    fileDiff: (repoPath, filePath) => ipcRenderer.invoke('newroz:git:fileDiff', repoPath, filePath),
    scanRepos: (roots, options) => ipcRenderer.invoke('newroz:git:scanRepos', roots, options),
    review: {
      list: (repoPath, scope, baseRef) => ipcRenderer.invoke('newroz:git:review:list', repoPath, scope, baseRef),
      diff: (repoPath, filePath, scope, baseRef, staged) =>
        ipcRenderer.invoke('newroz:git:review:diff', repoPath, filePath, scope, baseRef, staged),
      stage: (repoPath, filePath) => ipcRenderer.invoke('newroz:git:review:stage', repoPath, filePath),
      unstage: (repoPath, filePath) => ipcRenderer.invoke('newroz:git:review:unstage', repoPath, filePath),
      revert: (repoPath, filePath) => ipcRenderer.invoke('newroz:git:review:revert', repoPath, filePath),
      revParse: (repoPath, ref) => ipcRenderer.invoke('newroz:git:review:revParse', repoPath, ref),
      commit: (repoPath, message, push) => ipcRenderer.invoke('newroz:git:review:commit', repoPath, message, push),
      commitContext: repoPath => ipcRenderer.invoke('newroz:git:review:commitContext', repoPath),
      push: repoPath => ipcRenderer.invoke('newroz:git:review:push', repoPath),
      shipInfo: repoPath => ipcRenderer.invoke('newroz:git:review:shipInfo', repoPath),
      createPr: repoPath => ipcRenderer.invoke('newroz:git:review:createPr', repoPath)
    }
  },
  terminal: {
    dispose: id => ipcRenderer.invoke('newroz:terminal:dispose', id),
    resize: (id, size) => ipcRenderer.invoke('newroz:terminal:resize', id, size),
    start: options => ipcRenderer.invoke('newroz:terminal:start', options),
    write: (id, data) => ipcRenderer.invoke('newroz:terminal:write', id, data),
    onData: (id, callback) => {
      const channel = `newroz:terminal:${id}:data`
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.removeListener(channel, listener)
    },
    onExit: (id, callback) => {
      const channel = `newroz:terminal:${id}:exit`
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on(channel, listener)
      return () => ipcRenderer.removeListener(channel, listener)
    }
  },
  onClosePreviewRequested: callback => {
    const listener = () => callback()
    ipcRenderer.on('newroz:close-preview-requested', listener)
    return () => ipcRenderer.removeListener('newroz:close-preview-requested', listener)
  },
  onOpenUpdatesRequested: callback => {
    const listener = () => callback()
    ipcRenderer.on('newroz:open-updates', listener)
    return () => ipcRenderer.removeListener('newroz:open-updates', listener)
  },
  onDeepLink: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('newroz:deep-link', listener)
    return () => ipcRenderer.removeListener('newroz:deep-link', listener)
  },
  signalDeepLinkReady: () => ipcRenderer.invoke('newroz:deep-link-ready'),
  onWindowStateChanged: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('newroz:window-state-changed', listener)
    return () => ipcRenderer.removeListener('newroz:window-state-changed', listener)
  },
  onFocusSession: callback => {
    const listener = (_event, sessionId) => callback(sessionId)
    ipcRenderer.on('newroz:focus-session', listener)
    return () => ipcRenderer.removeListener('newroz:focus-session', listener)
  },
  onNotificationAction: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('newroz:notification-action', listener)
    return () => ipcRenderer.removeListener('newroz:notification-action', listener)
  },
  onPreviewFileChanged: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('newroz:preview-file-changed', listener)
    return () => ipcRenderer.removeListener('newroz:preview-file-changed', listener)
  },
  onBackendExit: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('newroz:backend-exit', listener)
    return () => ipcRenderer.removeListener('newroz:backend-exit', listener)
  },
  onPowerResume: callback => {
    const listener = () => callback()
    ipcRenderer.on('newroz:power-resume', listener)
    return () => ipcRenderer.removeListener('newroz:power-resume', listener)
  },
  onBootProgress: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('newroz:boot-progress', listener)
    return () => ipcRenderer.removeListener('newroz:boot-progress', listener)
  },
  // First-launch bootstrap progress -- emitted by the install.ps1 stage
  // runner in main.cjs (apps/desktop/electron/bootstrap-runner.cjs).
  // Renderer's install overlay subscribes to live events and queries the
  // current snapshot via getBootstrapState() to recover after a devtools
  // reload mid-bootstrap.
  getBootstrapState: () => ipcRenderer.invoke('newroz:bootstrap:get'),
  resetBootstrap: () => ipcRenderer.invoke('newroz:bootstrap:reset'),
  repairBootstrap: () => ipcRenderer.invoke('newroz:bootstrap:repair'),
  cancelBootstrap: () => ipcRenderer.invoke('newroz:bootstrap:cancel'),
  onBootstrapEvent: callback => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('newroz:bootstrap:event', listener)
    return () => ipcRenderer.removeListener('newroz:bootstrap:event', listener)
  },
  getVersion: () => ipcRenderer.invoke('newroz:version'),
  getRemoteDisplayReason: () => ipcRenderer.invoke('newroz:get-remote-display-reason'),
  uninstall: {
    summary: () => ipcRenderer.invoke('newroz:uninstall:summary'),
    run: mode => ipcRenderer.invoke('newroz:uninstall:run', { mode })
  },
  updates: {
    check: () => ipcRenderer.invoke('newroz:updates:check'),
    apply: opts => ipcRenderer.invoke('newroz:updates:apply', opts),
    getBranch: () => ipcRenderer.invoke('newroz:updates:branch:get'),
    setBranch: name => ipcRenderer.invoke('newroz:updates:branch:set', name),
    onProgress: callback => {
      const listener = (_event, payload) => callback(payload)
      ipcRenderer.on('newroz:updates:progress', listener)
      return () => ipcRenderer.removeListener('newroz:updates:progress', listener)
    }
  },
  themes: {
    fetchMarketplace: id => ipcRenderer.invoke('newroz:vscode-theme:fetch', id),
    searchMarketplace: query => ipcRenderer.invoke('newroz:vscode-theme:search', query)
  }
})
