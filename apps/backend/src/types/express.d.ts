import type { UserEntity } from '../modules/users/entities/user.entity';

declare global {
  namespace Express {
    // Extend Express.User to be UserEntity (used by Passport)
     
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends UserEntity {}
  }
}

export {};

