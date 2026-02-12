import express from 'express';
import cors from 'cors';
import ffmpeg from 'fluent-ffmpeg';
import { Readable, PassThrough } from 'stream';
import { pipeline } from 'stream/promises';
import archiver from 'archiver';
import { mkdir, writeFile, readdir, unlink, readFile, copyFile, appendFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLAUDE_SOUNDS_DIR = join(homedir(), '.claude', 'sounds');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Proxy audio for playback (handles CORS and missing files gracefully)
app.get('/api/audio', async (req, res) => {
  const { url } = req.query;

  console.log('Audio proxy request, URL:', url);

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    console.log('Fetching:', url);
    const response = await fetch(url);
    console.log('Response status:', response.status);

    if (!response.ok) {
      console.log('Audio not found, status:', response.status);
      return res.status(404).json({ error: 'Audio not found' });
    }

    res.setHeader('Content-Type', 'audio/ogg');
    res.setHeader('Accept-Ranges', 'bytes');

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Audio proxy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download and convert audio
app.get('/api/download', async (req, res) => {
  const { url, filename } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    console.log(`Downloading: ${url}`);

    // Fetch the OGG file from the wiki
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Set response headers for download
    const outputFilename = filename || 'audio.mp3';
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${outputFilename}"`);

    // Convert OGG to MP3 using ffmpeg
    const readable = Readable.from(buffer);

    ffmpeg(readable)
      .inputFormat('ogg')
      .audioCodec('libmp3lame')
      .audioBitrate(192)
      .format('mp3')
      .on('error', (err) => {
        console.error('FFmpeg error:', err.message);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Conversion failed: ' + err.message });
        }
      })
      .on('end', () => {
        console.log(`Conversion complete: ${outputFilename}`);
      })
      .pipe(res, { end: true });

  } catch (error) {
    console.error('Download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Helper function to convert OGG to MP3 and return as buffer
function convertToMp3(oggBuffer) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const readable = Readable.from(oggBuffer);
    const passThrough = new PassThrough();

    ffmpeg(readable)
      .inputFormat('ogg')
      .audioCodec('libmp3lame')
      .audioBitrate(192)
      .format('mp3')
      .on('error', reject)
      .pipe(passThrough);

    passThrough.on('data', chunk => chunks.push(chunk));
    passThrough.on('end', () => resolve(Buffer.concat(chunks)));
    passThrough.on('error', reject);
  });
}

// Batch download - returns a ZIP file with all selected quotes
app.post('/api/download-batch', async (req, res) => {
  const { quotes } = req.body;

  if (!quotes || !quotes.length) {
    return res.status(400).json({ error: 'No quotes provided' });
  }

  console.log(`Batch download: ${quotes.length} quotes`);

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="sc2-quotes.zip"');

  const archive = archiver('zip', { zlib: { level: 5 } });
  archive.pipe(res);

  archive.on('error', (err) => {
    console.error('Archive error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Archive creation failed' });
    }
  });

  for (const quote of quotes) {
    try {
      console.log(`Processing: ${quote.filename}`);
      const response = await fetch(quote.audioUrl);

      if (!response.ok) {
        console.log(`Skipping ${quote.filename}: fetch failed with status ${response.status}`);
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const oggBuffer = Buffer.from(arrayBuffer);
      const mp3Buffer = await convertToMp3(oggBuffer);

      // Organize in folders: UnitName/CategoryName/filename.mp3
      const path = `${quote.unitName}/${quote.categoryName}/${quote.filename}`;
      archive.append(mp3Buffer, { name: path });
      console.log(`Added: ${path}`);
    } catch (error) {
      console.error(`Failed to process ${quote.filename}:`, error.message);
    }
  }

  await archive.finalize();
  console.log('Batch download complete');
});

// Save directly to ~/.claude/sounds/<folder>/
app.post('/api/save-to-sounds', async (req, res) => {
  const { quotes, folder } = req.body;

  const validFolders = ['done', 'start', 'userpromptsubmit', 'precompact', 'permission', 'question'];
  if (!validFolders.includes(folder)) {
    return res.status(400).json({ error: `Invalid folder. Must be one of: ${validFolders.join(', ')}` });
  }

  if (!quotes || !quotes.length) {
    return res.status(400).json({ error: 'No quotes provided' });
  }

  const targetDir = join(CLAUDE_SOUNDS_DIR, folder);

  // Create directory if it doesn't exist
  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true });
    console.log(`Created directory: ${targetDir}`);
  }

  console.log(`Saving ${quotes.length} quotes to ${targetDir}`);

  const results = { saved: [], failed: [] };

  for (const quote of quotes) {
    try {
      console.log(`Processing: ${quote.filename}`);
      const response = await fetch(quote.audioUrl);

      if (!response.ok) {
        console.log(`Skipping ${quote.filename}: fetch failed with status ${response.status}`);
        results.failed.push({ filename: quote.filename, error: 'Fetch failed' });
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const oggBuffer = Buffer.from(arrayBuffer);
      const mp3Buffer = await convertToMp3(oggBuffer);

      const filePath = join(targetDir, quote.filename);
      await writeFile(filePath, mp3Buffer);
      console.log(`Saved: ${filePath}`);
      results.saved.push(quote.filename);
    } catch (error) {
      console.error(`Failed to process ${quote.filename}:`, error.message);
      results.failed.push({ filename: quote.filename, error: error.message });
    }
  }

  console.log(`Save complete: ${results.saved.length} saved, ${results.failed.length} failed`);
  res.json({
    success: true,
    targetDir,
    saved: results.saved.length,
    failed: results.failed.length,
    details: results
  });
});

// Sync all quotes to their respective folders in ~/.claude/sounds/
// - Deletes files not in the setup
// - Skips files that already exist
// - Downloads missing files
app.post('/api/save-to-sounds-all', async (req, res) => {
  const { quotes } = req.body;

  if (!quotes || !quotes.length) {
    return res.status(400).json({ error: 'No quotes provided' });
  }

  const validFolders = ['done', 'start', 'userpromptsubmit', 'precompact', 'permission', 'question'];

  console.log(`Syncing ${quotes.length} quotes to ~/.claude/sounds/`);

  // Group quotes by folder
  const quotesByFolder = {};
  for (const folder of validFolders) {
    quotesByFolder[folder] = [];
  }
  for (const quote of quotes) {
    if (validFolders.includes(quote.folder)) {
      quotesByFolder[quote.folder].push(quote);
    }
  }

  const results = { saved: [], skipped: [], deleted: [], failed: [] };

  // Process each folder
  for (const folder of validFolders) {
    const targetDir = join(CLAUDE_SOUNDS_DIR, folder);
    const expectedFiles = new Set(quotesByFolder[folder].map(q => q.filename));

    // Create directory if it doesn't exist
    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true });
      console.log(`Created directory: ${targetDir}`);
    }

    // Get existing files and delete orphans
    try {
      const existingFiles = await readdir(targetDir);
      for (const file of existingFiles) {
        if (!expectedFiles.has(file)) {
          const filePath = join(targetDir, file);
          await unlink(filePath);
          console.log(`Deleted orphan: ${filePath}`);
          results.deleted.push({ filename: file, folder });
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${targetDir}:`, error.message);
    }

    // Download missing files
    for (const quote of quotesByFolder[folder]) {
      const filePath = join(targetDir, quote.filename);

      // Skip if file already exists
      if (existsSync(filePath)) {
        console.log(`Skipping (exists): ${quote.filename}`);
        results.skipped.push({ filename: quote.filename, folder });
        continue;
      }

      try {
        console.log(`Downloading: ${quote.filename} -> ${folder}/`);
        const response = await fetch(quote.audioUrl);

        if (!response.ok) {
          console.log(`Failed to fetch ${quote.filename}: status ${response.status}`);
          results.failed.push({ filename: quote.filename, error: 'Fetch failed' });
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const oggBuffer = Buffer.from(arrayBuffer);
        const mp3Buffer = await convertToMp3(oggBuffer);

        await writeFile(filePath, mp3Buffer);
        console.log(`Saved: ${filePath}`);
        results.saved.push({ filename: quote.filename, folder });
      } catch (error) {
        console.error(`Failed to process ${quote.filename}:`, error.message);
        results.failed.push({ filename: quote.filename, error: error.message });
      }
    }
  }

  console.log(`Sync complete: ${results.saved.length} saved, ${results.skipped.length} skipped, ${results.deleted.length} deleted, ${results.failed.length} failed`);
  res.json({
    success: true,
    saved: results.saved.length,
    skipped: results.skipped.length,
    deleted: results.deleted.length,
    failed: results.failed.length,
    details: results
  });
});

// Get info about sounds directory
app.get('/api/sounds-info', (req, res) => {
  const folders = ['done', 'start', 'userpromptsubmit', 'precompact', 'permission', 'question'];
  const info = folders.map(folder => ({
    name: folder,
    path: join(CLAUDE_SOUNDS_DIR, folder),
    exists: existsSync(join(CLAUDE_SOUNDS_DIR, folder))
  }));
  res.json({ baseDir: CLAUDE_SOUNDS_DIR, folders: info });
});

// Detect user's shell and get appropriate config file
function getShellConfig() {
  const shell = process.env.SHELL || '/bin/zsh';
  if (shell.includes('bash')) {
    // Prefer .bash_profile on macOS, .bashrc on Linux
    const bashProfile = join(homedir(), '.bash_profile');
    const bashrc = join(homedir(), '.bashrc');
    if (existsSync(bashProfile)) {
      return { shell: 'bash', configPath: bashProfile, configName: '.bash_profile' };
    }
    return { shell: 'bash', configPath: bashrc, configName: '.bashrc' };
  }
  return { shell: 'zsh', configPath: join(homedir(), '.zshrc'), configName: '.zshrc' };
}

// Setup the sound listener script
app.post('/api/setup-listener', async (req, res) => {
  const scriptSource = join(__dirname, '..', 'claude-sounds.zsh');
  const scriptDest = join(homedir(), '.claude-sounds.zsh');
  const { shell, configPath, configName } = getShellConfig();
  const sourceLine = '\n# Claude Code sound notifications\nsource ~/.claude-sounds.zsh\n';

  try {
    // Check if source script exists
    if (!existsSync(scriptSource)) {
      return res.status(404).json({ error: 'claude-sounds.zsh not found in project' });
    }

    // Copy script to home directory
    await copyFile(scriptSource, scriptDest);
    console.log(`Copied script to ${scriptDest}`);

    // Check if already in shell config
    let configContent = '';
    let alreadyAdded = false;
    if (existsSync(configPath)) {
      configContent = await readFile(configPath, 'utf-8');
      alreadyAdded = configContent.includes('.claude-sounds.zsh');
    }

    // Add to shell config if not present
    if (!alreadyAdded) {
      await appendFile(configPath, sourceLine);
      console.log(`Added source line to ${configName}`);
    }

    // Check if fswatch is installed
    let fswatchInstalled = false;
    try {
      execSync('which fswatch', { stdio: 'pipe' });
      fswatchInstalled = true;
    } catch {
      fswatchInstalled = false;
    }

    // Try to start the watcher by sourcing the script
    let started = false;
    if (fswatchInstalled) {
      try {
        execSync(`zsh -c 'source ${scriptDest}'`, { stdio: 'pipe' });
        started = true;
      } catch {
        started = false;
      }
    }

    // Warn if using bash (script has zsh-specific syntax)
    const bashWarning = shell === 'bash'
      ? ' Note: The listener script uses zsh syntax. You may need zsh installed or a bash-compatible version.'
      : '';

    res.json({
      success: true,
      scriptInstalled: true,
      shell,
      configFile: configName,
      addedToConfig: !alreadyAdded,
      addedToZshrc: !alreadyAdded && shell === 'zsh',  // backwards compatibility
      fswatchInstalled,
      started,
      message: fswatchInstalled
        ? (started ? 'Listener setup complete and running!' : `Listener installed. Restart your terminal to activate.${bashWarning}`)
        : `Listener installed. Install fswatch (brew install fswatch) and restart your terminal.${bashWarning}`
    });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Required hooks for sound notifications
const REQUIRED_HOOKS = [
  { name: 'SessionStart', event: 'SessionStart', triggerFile: '.claude-start',
    config: { matcher: 'startup|clear', hooks: [{ type: 'command', command: 'touch ~/.claude/.claude-start' }] } },
  { name: 'UserPromptSubmit', event: 'UserPromptSubmit', triggerFile: '.claude-prompt',
    config: { hooks: [{ type: 'command', command: 'touch ~/.claude/.claude-prompt' }] } },
  { name: 'Stop', event: 'Stop', triggerFile: '.claude-done',
    config: { hooks: [{ type: 'command', command: 'touch ~/.claude/.claude-done' }] } },
  { name: 'PreCompact', event: 'PreCompact', triggerFile: '.claude-compact',
    config: { hooks: [{ type: 'command', command: 'touch ~/.claude/.claude-compact' }] } },
  { name: 'PermissionPrompt', event: 'Notification', triggerFile: '.claude-permission',
    config: { matcher: 'permission_prompt', hooks: [{ type: 'command', command: 'touch ~/.claude/.claude-permission' }] } },
  { name: 'Question', event: 'Notification', triggerFile: '.claude-question',
    config: { matcher: 'elicitation_dialog', hooks: [{ type: 'command', command: 'touch ~/.claude/.claude-question' }] } },
];

// Check hooks status
app.get('/api/hooks-status', async (req, res) => {
  const settingsPath = join(homedir(), '.claude', 'settings.json');

  try {
    let settings = { hooks: {} };
    if (existsSync(settingsPath)) {
      const content = await readFile(settingsPath, 'utf-8');
      settings = JSON.parse(content);
    }

    const status = {};
    for (const { name, event, triggerFile } of REQUIRED_HOOKS) {
      const existingHooks = settings.hooks?.[event] || [];
      const hasOurHook = existingHooks.some(entry =>
        entry.hooks?.some(h => h.command?.includes(triggerFile))
      );
      status[name] = hasOurHook;
    }

    res.json({
      allConfigured: Object.values(status).every(v => v),
      hooks: status
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Setup hooks
app.post('/api/setup-hooks', async (req, res) => {
  const settingsPath = join(homedir(), '.claude', 'settings.json');
  const claudeDir = join(homedir(), '.claude');

  try {
    // Ensure .claude directory exists
    if (!existsSync(claudeDir)) {
      await mkdir(claudeDir, { recursive: true });
    }

    // Read existing settings or create new
    let settings = {};
    if (existsSync(settingsPath)) {
      const content = await readFile(settingsPath, 'utf-8');
      settings = JSON.parse(content);
    }

    if (!settings.hooks) {
      settings.hooks = {};
    }

    const added = [];
    const skipped = [];

    for (const { name, event, triggerFile, config } of REQUIRED_HOOKS) {
      const existingHooks = settings.hooks[event] || [];

      // Check if our touch command already exists
      const hasOurHook = existingHooks.some(entry =>
        entry.hooks?.some(h => h.command?.includes(triggerFile))
      );

      if (hasOurHook) {
        skipped.push(name);
      } else {
        // Add our hook
        settings.hooks[event] = [...existingHooks, config];
        added.push(name);
      }
    }

    // Write updated settings
    await writeFile(settingsPath, JSON.stringify(settings, null, 2));

    res.json({
      success: true,
      added,
      skipped,
      message: added.length > 0
        ? `Added ${added.length} hooks: ${added.join(', ')}`
        : 'All hooks already configured'
    });
  } catch (error) {
    console.error('Setup hooks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Shell config files to check
const SHELL_CONFIGS = [
  { name: 'zshrc', path: join(homedir(), '.zshrc') },
  { name: 'bashrc', path: join(homedir(), '.bashrc') },
  { name: 'bash_profile', path: join(homedir(), '.bash_profile') },
];

// Get listener status
app.get('/api/listener-status', async (req, res) => {
  const scriptDest = join(homedir(), '.claude-sounds.zsh');
  const pidFile = join(homedir(), '.claude_watcher.pid');

  const scriptInstalled = existsSync(scriptDest);

  // Check all shell config files
  const shellConfigs = {};
  let inShellConfig = false;
  for (const config of SHELL_CONFIGS) {
    if (existsSync(config.path)) {
      const content = await readFile(config.path, 'utf-8');
      const hasSource = content.includes('.claude-sounds.zsh');
      shellConfigs[config.name] = hasSource;
      if (hasSource) inShellConfig = true;
    } else {
      shellConfigs[config.name] = false;
    }
  }

  let fswatchInstalled = false;
  try {
    execSync('which fswatch', { stdio: 'pipe' });
    fswatchInstalled = true;
  } catch {
    fswatchInstalled = false;
  }

  let running = false;
  if (existsSync(pidFile)) {
    try {
      const pid = await readFile(pidFile, 'utf-8');
      execSync(`kill -0 ${pid.trim()}`, { stdio: 'pipe' });
      running = true;
    } catch {
      running = false;
    }
  }

  res.json({
    scriptInstalled,
    inShellConfig,        // true if in ANY shell config
    shellConfigs,         // detailed breakdown
    inZshrc: shellConfigs.zshrc,  // backwards compatibility
    fswatchInstalled,
    running
  });
});

// Toggle sounds on/off (mirrors cst command)
app.post('/api/toggle-sounds', async (req, res) => {
  const scriptPath = join(homedir(), '.claude-sounds.zsh');
  const pidFile = join(homedir(), '.claude_watcher.pid');
  const enabledFile = join(homedir(), '.claude_sounds_enabled');

  if (!existsSync(scriptPath)) {
    return res.status(400).json({ error: 'Sound listener script not installed' });
  }

  try {
    // Check if currently running
    let isRunning = false;
    if (existsSync(pidFile)) {
      try {
        const pid = await readFile(pidFile, 'utf-8');
        execSync(`kill -0 ${pid.trim()}`, { stdio: 'pipe' });
        isRunning = true;
      } catch {
        isRunning = false;
      }
    }

    if (isRunning) {
      // Stop: kill processes and update state
      execSync(`zsh -c 'source ${scriptPath} && claude_sound_watcher_stop'`, { stdio: 'pipe' });
      await writeFile(enabledFile, '0');
    } else {
      // Start: use spawn with detached to properly background
      const { spawn } = await import('child_process');
      const child = spawn('zsh', ['-c', `source ${scriptPath} && claude_sound_watcher_start`], {
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      // Give it a moment to write the PID file
      await new Promise(r => setTimeout(r, 300));
      await writeFile(enabledFile, '1');
    }

    // Check new state
    let running = false;
    if (existsSync(pidFile)) {
      try {
        const pid = await readFile(pidFile, 'utf-8');
        execSync(`kill -0 ${pid.trim()}`, { stdio: 'pipe' });
        running = true;
      } catch {
        running = false;
      }
    }

    res.json({ success: true, running });
  } catch (error) {
    console.error('Toggle sounds error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
