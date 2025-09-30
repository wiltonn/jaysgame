import type { TokenPayload } from '../utils/auth';

declare module 'express-serve-static-core' {
  interface Request {
    user?: TokenPayload;
  }
}
