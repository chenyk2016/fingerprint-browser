const Joi = require('joi');

const fingerprintSchema = Joi.object({
  navigator: Joi.object({
    userAgent: Joi.string().required(),
    platform: Joi.string().required(),
    // ... 其他验证
  }).required(),
  // ... 其他验证
});

module.exports = {
  validateConfig: (config) => fingerprintSchema.validate(config)
}; 