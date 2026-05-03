import { Sequelize } from 'sequelize';
import config from './env';

export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  username: config.database.user,
  password: config.database.password,
  logging: config.server.env === 'development' ? console.log : false,
});

export const initializeDatabase = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await sequelize.close();
    console.log('✅ Database connection has been closed.');
  } catch (error) {
    console.error('❌ Error occurred while closing the database connection:', error);
    throw error;
  }
};
