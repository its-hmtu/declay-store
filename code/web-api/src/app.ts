import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { sendSuccess } from './utils/response';
import { errorHandler } from './middlewares/error-handler';
import { createAuthRouter } from './auth/auth.route';


export function createApp(): Express {
  const app = express();
  const apiPrefix = '/api';
  const apiRouter = express.Router();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));
  app.use(express.static('public'));
  // versioned API routes
  app.use(apiPrefix, apiRouter);
  apiRouter.use('/auth', createAuthRouter());


  app.use(errorHandler);

  return app;
}
