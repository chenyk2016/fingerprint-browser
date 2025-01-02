class BrowserError extends Error {
  constructor(message, browserType) {
    super(message);
    this.name = 'BrowserError';
    this.browserType = browserType;
  }
}

class ConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConfigError';
  }
}

module.exports = {
  BrowserError,
  ConfigError
}; 