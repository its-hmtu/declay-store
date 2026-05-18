require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host:     process.env.DB_HOST || 'localhost',
    port:     Number(process.env.DB_PORT) || 5431,
    dialect:  'postgres',
    logging:  console.log,
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME + '_test',
    host:     process.env.DB_HOST || 'localhost',
    port:     Number(process.env.DB_PORT) || 5431,
    dialect:  'postgres',
    logging:  false,
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host:     process.env.DB_HOST,
    port:     Number(process.env.DB_PORT) || 5431,
    dialect:  'postgres',
    logging:  false,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false },
    },
  },
};
