import type { Request } from 'express';
import type { AccessTokenPayload } from '../jwt.service';

export type AuthenticatedRequest = Request & {
  user: AccessTokenPayload;
};
