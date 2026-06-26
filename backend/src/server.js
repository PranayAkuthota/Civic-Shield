"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _express = _interopRequireDefault(require("express"));
var _dotenv = _interopRequireDefault(require("dotenv"));
var _database = require("./config/database");
var _logger = require("./utils/logger");
var _security = require("./middleware/security");
var _auth = _interopRequireDefault(require("./routes/auth"));
var _complaints = _interopRequireDefault(require("./routes/complaints"));
var _upload = _interopRequireDefault(require("./routes/upload"));
var _users = _interopRequireDefault(require("./routes/users"));
var _analytics = _interopRequireDefault(require("./routes/analytics"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
// Import routes

// Load environment variables
_dotenv.default.config();
class Server {
  constructor() {
    this.app = (0, _express.default)();
    this.port = parseInt(process.env.PORT || '5000');
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }
  initializeMiddleware() {
    // Security and performance middleware
    this.app.use(_security.securityHeaders);
    this.app.use(_security.configureCors);
    this.app.use(_security.compressResponses);
    this.app.use(_express.default.json({
      limit: '10mb'
    }));
    this.app.use(_express.default.urlencoded({
      extended: true,
      limit: '10mb'
    }));

    // Serve static uploaded files
    const path = require('path');
    this.app.use('/uploads', _express.default.static(path.join(__dirname, '../uploads')));

    // Rate limiting
    this.app.use(_security.generalLimiter);

    // Logging and validation
    this.app.use(_security.requestLogger);
    this.app.use(_security.validateInput);
    this.app.use(_logger.httpLogger);
    this.app.use(_security.apiVersion);
  }
  initializeRoutes() {
    // Health check endpoint
    this.app.get('/health', _security.healthCheck);

    // API routes
    this.app.use('/api/auth', _auth.default);
    this.app.use('/api/complaints', _complaints.default);
    this.app.use('/api/upload', _upload.default);
    this.app.use('/api/users', _users.default);
    this.app.use('/api/analytics', _analytics.default);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Civic Shield API',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      });
    });

    // API info endpoint
    this.app.get('/api', (req, res) => {
      res.json({
        success: true,
        message: 'API Information',
        endpoints: {
          auth: '/api/auth',
          complaints: '/api/complaints',
          upload: '/api/upload',
          users: '/api/users',
          analytics: '/api/analytics',
          health: '/health',
          documentation: '/api/docs' // TODO: Add API documentation
        }
      });
    });
  }
  initializeErrorHandling() {
    // 404 handler must be last
    this.app.use(_security.notFoundHandler);

    // Error handler must be last
    this.app.use(_security.errorHandler);
  }
  async start() {
    try {
      // Connect to database
      await (0, _database.connectDatabase)();

      // Start server
      this.app.listen(this.port, () => {
        _logger.logger.info(`Server started successfully on port ${this.port}`);
        _logger.logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        _logger.logger.info(`API Documentation: http://localhost:${this.port}/api`);
      });
    } catch (error) {
      _logger.logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
  getApp() {
    return this.app;
  }
}

// Create and start server
const server = new Server();

// Graceful shutdown
process.on('SIGTERM', () => {
  _logger.logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});
process.on('SIGINT', () => {
  _logger.logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', error => {
  _logger.logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  _logger.logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  server.start();
}
var _default = exports.default = server;