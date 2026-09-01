const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { log } = require('../src/utils/logger');

test('Logger writes expected line format and handles missing directory', (t) => {
  const logDir = path.resolve('.cache/logs');
  const logFile = path.join(logDir, 'app.log');

  // Clean up if exists
  if (fs.existsSync(logFile)) fs.unlinkSync(logFile);
  if (fs.existsSync(logDir)) fs.rmSync(logDir, { recursive: true, force: true });

  // Should not throw when dir doesn't exist
  assert.doesNotThrow(() => {
    log('Test message', 'WARN');
  });

  // Verify file was created and contains correct format
  assert.ok(fs.existsSync(logFile), 'Log file should be created');
  const content = fs.readFileSync(logFile, 'utf8');
  
  // Format should be [TIMESTAMP] [LEVEL] MESSAGE
  const regex = /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[WARN\] Test message\n$/;
  assert.ok(regex.test(content), 'Log format does not match expected format: ' + content);
});
