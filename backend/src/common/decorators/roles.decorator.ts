import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Usage: @Roles(Role.ADMIN, Role.SUPER_ADMIN) above a controller method.
// The role check itself happens server-side in RolesGuard, never on the client.
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
