import {Injectable} from '@angular/core';
import {AuthGuard} from '@nestjs/passport';

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {}
