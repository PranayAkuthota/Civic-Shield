import express, { Application } from 'express';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database';
import { logger, httpLogger } from './utils/logger';
import {
  securityHeaders,
  configureCors,
  generalLimiter,
  compressResponses,
  requestLogger,
  validateInput,
  healthCheck,
  apiVersion,
  errorHandler,
  notFoundHandler
} from './middleware/security';

// Import routes
import authRoutes from './routes/auth';

// Load environment variables
dotenv.config();

class Server {
  private app: Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '5000');
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security and performance middleware
    this.app.use(securityHeaders);
    this.app.use(configureCors);
    this.app.use(compressResponses);
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Rate limiting
    this.app.use(generalLimiter);

    // Logging and validation
    this.app.use(requestLogger);
    this.app.use(validateInput);
    this.app.use(httpLogger);
    this.app.use(apiVersion);
  }

  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', healthCheck);

    // API routes
    this.app.use('/api/auth', authRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Telangana Assets and Properties Protection API',
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
          health: '/health',
          documentation: '/api/docs' // TODO: Add API documentation
        }
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler must be last
    this.app.use(notFoundHandler);

    // Error handler must be last
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await connectDatabase();

      // Start server
      this.app.listen(this.port, () => {
        logger.info(`Server started successfully on port ${this.port}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`API Documentation: http://localhost:${this.port}/api`);
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public getApp(): Application {
    return this.app;
  }
}

// Create and start server
const server = new Server();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
if (require.main === module) {
  server.start();
}

export default server;