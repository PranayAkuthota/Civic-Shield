import mongoose from 'mongoose';
import { logger } from '../utils/logger';

interface DatabaseConfig {
  uri: string;
  options: mongoose.ConnectOptions;
}

const getDatabaseConfig = (): DatabaseConfig => {
  const uri = process.env.NODE_ENV === 'test'
    ? process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/telangana_properties_test'
    : process.env.MONGODB_URI || 'mongodb://localhost:27017/telangana_properties';

  const options: mongoose.ConnectOptions = {
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    // Note: bufferMaxEntries and bufferCommands are deprecated in newer versions
    retryWrites: true,
    retryReads: true,
    readPreference: 'primary',
    writeConcern: {
      w: 'majority',
      j: true,
      wtimeout: 10000,
    },
  };

  return { uri, options };
};

export const connectDatabase = async (): Promise<void> => {
  try {
    const { uri, options } = getDatabaseConfig();

    // Set mongoose options
    mongoose.set('strictQuery', false);

    // Connect to MongoDB
    await mongoose.connect(uri, options);

    logger.info(`Connected to MongoDB: ${uri}`);

    // Handle connection events
    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        logger.error('Error during MongoDB connection closure:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed successfully');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', error);
    throw error;
  }
};

// Database health check
export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    const state = mongoose.connection.readyState;
    return state === 1; // 1 means connected
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
};