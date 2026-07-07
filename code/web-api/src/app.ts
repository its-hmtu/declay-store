import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import { errorHandler } from './middlewares/error-handler';
import { createRoutes } from './routes';
import { createWebhookRouter } from './modules/payment/payment.route';
import passport from './config/passport-google';
import config from './config/env';

export function createApp(): Express {
  const app = express();
  // Trust the first proxy hop so client IP (and rate limiting) is correct behind a reverse proxy.
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
  const apiPrefix = '/api';

  // Stripe webhook must receive raw body — mount before express.json()
  app.use(`${apiPrefix}/webhooks`, express.raw({ type: 'application/json' }), createWebhookRouter());

  // Session middleware
  app.use(session({
    secret: config.oauth.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: config.server.env === 'production',
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }));

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan('dev'));

  // Public assets (uploaded images) are loaded by the frontend on a different
  // origin, so relax Helmet's default Cross-Origin-Resource-Policy for them only.
  app.use(
    express.static('public', {
      setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.use(apiPrefix, createRoutes());

  app.use(errorHandler);

  return app;
}
