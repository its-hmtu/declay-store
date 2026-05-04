import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import { sendSuccess } from './utils/response';
import { errorHandler } from './middlewares/error-handler';
import { createRoutes } from './routes';
import passport from './config/passport-google';
import config from './config/env';

export function createApp(): Express {
  const app = express();
  const apiPrefix = '/api';

  // Session middleware
  app.use(session({
    secret: config.oauth.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.server.env === 'production',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    }
  }));

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));
  app.use(express.static('public'));

  // Passport initialization
  app.use(passport.initialize());
  app.use(passport.session());

  // Mount versioned API routes
  app.use(apiPrefix, createRoutes());
  
  app.use(errorHandler);

  return app;
}
