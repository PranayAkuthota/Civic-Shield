"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.disconnectDatabase = exports.connectDatabase = exports.checkDatabaseHealth = void 0;
var _mongoose = _interopRequireDefault(require("mongoose"));
var _logger = require("../utils/logger");
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
const getDatabaseConfig = () => {
  const uri = process.env.NODE_ENV === 'test' ? process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/telangana_properties_test' : process.env.MONGODB_URI || 'mongodb://localhost:27017/telangana_properties';
  const options = {
    maxPoolSize: 10,
    // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000,
    // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000,
    // Close sockets after 45 seconds of inactivity
    // Note: bufferMaxEntries and bufferCommands are deprecated in newer versions
    retryWrites: true,
    retryReads: true,
    readPreference: 'primary',
    writeConcern: {
      w: 'majority',
      j: true,
      wtimeout: 10000
    }
  };
  return {
    uri,
    options
  };
};
const connectDatabase = async () => {
  try {
    const {
      uri,
      options
    } = getDatabaseConfig();

    // Set mongoose options
    _mongoose.default.set('strictQuery', false);

    // Connect to MongoDB
    await _mongoose.default.connect(uri, options);
    _logger.logger.info(`Connected to MongoDB: ${uri}`);

    // Handle connection events
    _mongoose.default.connection.on('error', error => {
      _logger.logger.error('MongoDB connection error:', error);
    });
    _mongoose.default.connection.on('disconnected', () => {
      _logger.logger.warn('MongoDB disconnected');
    });
    _mongoose.default.connection.on('reconnected', () => {
      _logger.logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await _mongoose.default.connection.close();
        _logger.logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        _logger.logger.error('Error during MongoDB connection closure:', error);
        process.exit(1);
      }
    });
  } catch (error) {
    _logger.logger.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};
exports.connectDatabase = connectDatabase;
const disconnectDatabase = async () => {
  try {
    await _mongoose.default.connection.close();
    _logger.logger.info('MongoDB connection closed successfully');
  } catch (error) {
    _logger.logger.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

// Database health check
exports.disconnectDatabase = disconnectDatabase;
const checkDatabaseHealth = async () => {
  try {
    const state = _mongoose.default.connection.readyState;
    return state === 1; // 1 means connected
  } catch (error) {
    _logger.logger.error('Database health check failed:', error);
    return false;
  }
};
exports.checkDatabaseHealth = checkDatabaseHealth;