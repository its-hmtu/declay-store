import { Sequelize } from 'sequelize';

const globalForSequelize = globalThis as typeof globalThis & {
  sequelize?: Sequelize;
};

function createSequelizeInstance(): Sequelize {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return new Sequelize(databaseUrl, {
      dialect: 'postgres',
      logging: false,
    });
  }

  return new Sequelize(
    process.env.DB_NAME ?? 'postgres',
    process.env.DB_USER ?? 'postgres',
    process.env.DB_PASSWORD ?? '',
    {
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 5432),
      dialect: 'postgres',
      logging: false,
    },
  );
}

export const sequelize = globalForSequelize.sequelize ?? createSequelizeInstance();

if (process.env.NODE_ENV !== 'production') {
  globalForSequelize.sequelize = sequelize;
}

export async function connectSequelize(): Promise<void> {
  await sequelize.authenticate();

  console.log(
    `Connected to PostgreSQL database with ${process.env.DATABASE_URL ? 'DATABASE_URL' : 'host/port configuration'}`,
  );
}

export async function disconnectSequelize(): Promise<void> {
  await sequelize.close();
  console.log('Disconnected from PostgreSQL database');
}
