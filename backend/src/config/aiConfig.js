/**
 * @fileoverview AI Configuration Bridge
 * @description JavaScript bridge for backward compatibility during TS migration
 * This file re-exports the TypeScript AI configuration
 */

// Import TypeScript configuration
const aiConfig = require('./aiConfig.ts');

// Re-export the singleton instance for JavaScript compatibility
module.exports = aiConfig.default;

// Export all utilities and classes for JavaScript compatibility
module.exports.AIConfig = aiConfig.AIConfig;
module.exports.createAIConfig = aiConfig.createAIConfig;
module.exports.getAIConfig = aiConfig.getAIConfig;

// Export instance methods for direct access (backward compatibility)
module.exports.getAssignmentWeights = () => aiConfig.default.getAssignmentWeights();
module.exports.getConstraints = () => aiConfig.default.getConstraints();
module.exports.getLLMConfig = () => aiConfig.default.getLLMConfig();
module.exports.getCachingConfig = () => aiConfig.default.getCachingConfig();
module.exports.getBatchingConfig = () => aiConfig.default.getBatchingConfig();
module.exports.getMonitoringConfig = () => aiConfig.default.getMonitoringConfig();
module.exports.validateConfig = () => aiConfig.default.validateConfig();
module.exports.updateConfig = (updates) => aiConfig.default.updateConfig(updates);
module.exports.toJSON = () => aiConfig.default.toJSON();
module.exports.saveToFile = (filepath) => aiConfig.default.saveToFile(filepath);
module.exports.getConfig = () => aiConfig.default.getConfig();

// Legacy compatibility aliases
module.exports.config = aiConfig.default;
module.exports.aiConfigInstance = aiConfig.default;