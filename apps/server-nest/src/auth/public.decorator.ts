import { SetMetadata } from "@nestjs/common";

/**
 * Marker decorator that opts a controller / handler out of the global
 * JwtAuthGuard. Apply to `/health`, the login endpoint, etc.
 */
export const IS_PUBLIC_KEY = "auth:isPublic";

export const Public = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_PUBLIC_KEY, true);
