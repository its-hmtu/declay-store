import passport from 'passport';
import { Strategy as GoogleStrategy, StrategyOptions, Profile } from 'passport-google-oauth20';
import { VerifyCallback } from 'passport-google-oauth20';
import config from './env';
import User from '@/user/user.entity';

const googleAuthConfig: StrategyOptions = {
  clientID: config.oauth.googleClientId || '',
  clientSecret: config.oauth.googleClientSecret || '',
  callbackURL: config.oauth.googleCallbackUrl || '',
};

// Serialize user
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// Google Strategy
passport.use(
  new GoogleStrategy(googleAuthConfig, async (accessToken: string, refreshToken: string, profile: Profile, done: VerifyCallback) => {
    try {
      const email = profile.emails?.[0]?.value;
      
      // Email is required from Google
      if (!email) {
        return done(new Error('No email found in Google profile'));
      }

      // Check if user already exists
      let user = await User.findOne({
        where: { googleId: profile.id },
      });

      if (user) {
        // User exists, return user
        return done(null, user);
      }

      // Check if email already exists (for linking accounts)
      user = await User.findOne({
        where: { email },
      });

      if (user && !user.googleId) {
        // Link Google ID to existing user
        user.googleId = profile.id;
        user.authProvider = 'google';
        user.isEmailVerified = true; // Google emails are verified
        await user.save();
        return done(null, user);
      }

      if (user && user.googleId) {
        // User already linked with different provider
        return done(null, user);
      }

      // Create new user
      const newUser = await User.create({
        email,
        fullName: profile.displayName,
        username: profile.username || email,
        googleId: profile.id,
        authProvider: 'google',
        isEmailVerified: true, // Google emails are always verified
        isActive: true,
      });

      return done(null, newUser);
    } catch (error) {
      done(error);
    }
  })
);

export default passport;
