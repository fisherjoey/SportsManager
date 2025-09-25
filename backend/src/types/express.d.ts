import { User } from './database.types';

declare global {
  namespace Express {
    interface Request {
      user?: User | any;
      session?: any;
      auth?: any;
    }
  }
}

export {};