import {UuidString} from '../../../common-lib/src/type/uuid-string';

export type WaveLobbyId = UuidString & {readonly _waveLobbyId: unique symbol};
