import {JwtString} from '../../../common-lib/src/type/jwt-string';

import {KosLoginTicketPayload} from './kos-login-ticket.payload';

export type KosLoginTicket = JwtString<KosLoginTicketPayload> & {
  readonly _kosLoginTicket: unique symbol;
};
