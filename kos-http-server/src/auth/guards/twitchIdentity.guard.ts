import {Injectable} from '@angular/core';
import {AuthGuard} from '@nestjs/passport';

@Injectable()
export class TwitchIdentityGuard extends AuthGuard('twitch-identity') {}
