import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get('GOOGLE_CLIENT_ID') || 'dummy',
      clientSecret: config.get('GOOGLE_CLIENT_SECRET') || 'dummy',
      callbackURL: config.get('GOOGLE_CALLBACK_URL') || 'http://localhost:3000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const { id, displayName, emails, photos } = profile;
    done(null, {
      googleId: id,
      name: displayName,
      email: emails[0].value,
      avatar: photos?.[0]?.value,
    });
  }
}

