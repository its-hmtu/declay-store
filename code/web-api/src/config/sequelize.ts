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