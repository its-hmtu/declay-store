import { sequelize } from "@/config/sequelize";

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