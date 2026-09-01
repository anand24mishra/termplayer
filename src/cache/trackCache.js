const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');

let _allowList = null;

function getComplianceAllowList() {
  if (_allowList !== null) return _allowList;
  const compliancePath = path.resolve(__dirname, '../../docs/COMPLIANCE.md');
  if (!fs.existsSync(compliancePath)) {
    _allowList = [];
    return _allowList;
  }
  const content = fs.readFileSync(compliancePath, 'utf8');
  const jamendoMatch = content.match(/## Jamendo\s+[\s\S]*?- Per-track license allow-list[^:]*:([^\n]+)/i);
  if (!jamendoMatch) {
    _allowList = [];
    return _allowList;
  }
  
  const allowListStr = jamendoMatch[1].trim();
  if (allowListStr.includes('_pending_') || !allowListStr) {
    _allowList = [];
    return _allowList;
  }
  
  _allowList = allowListStr.split(',').map(s => s.trim()).filter(Boolean);
  return _allowList;
}

async function downloadTrack(track, config) {
  if (!config.trackCachingEnabled) {
    return null; // config check
  }

  const allowList = getComplianceAllowList();
  if (!track.license_ccurl || !allowList.some(allowed => track.license_ccurl.includes(allowed))) {
    return null; // allow-list check
  }

  if (!track.audiodownload) {
    return null;
  }

  if (!fs.existsSync(config.cacheDir)) {
    fs.mkdirSync(config.cacheDir, { recursive: true });
  }

  // Jamendo id format is 'jamendo:123', sanitize for filesystem
  const safeId = track.id.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = path.join(config.cacheDir, `${safeId}.mp3`);
  
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  const tempFilePath = filePath + '.tmp';
  
  try {
    const response = await fetch(track.audiodownload);
    if (!response.ok) {
      throw new Error(`Failed to download: HTTP ${response.statusCode}`);
    }
    
    const fileStream = fs.createWriteStream(tempFilePath);
    if (response.body.pipe) { // If using a fetch polyfill that supports standard stream piping
       await new Promise((resolve, reject) => {
         response.body.pipe(fileStream);
         response.body.on('error', reject);
         fileStream.on('finish', resolve);
       });
    } else {
       // Node 18+ native fetch
       const { Readable } = require('stream');
       await pipeline(Readable.fromWeb(response.body), fileStream);
    }
    
    fs.renameSync(tempFilePath, filePath);
    return filePath;
  } catch (err) {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    throw err;
  }
}

module.exports = { downloadTrack, getComplianceAllowList };
