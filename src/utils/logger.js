const fs = require('fs');
const path = require('path');

function log(message, level = 'INFO') {
  const logDir = path.resolve('.cache/logs');
  if (!fs.existsSync(logDir)) {
    try {
      fs.mkdirSync(logDir, { recursive: true });
    } catch (e) {
      // Ignore if it can't create
    }
  }

  const logFile = path.join(logDir, 'app.log');
  const timestamp = new Date().toISOString();
  const formattedMessage = `[${timestamp}] [${level}] ${message}\n`;

  try {
    fs.appendFileSync(logFile, formattedMessage, 'utf8');
  } catch (e) {
    // Fail silently if we can't write to the log
  }
}

module.exports = { log };
