import { SetMetadata } from '@nestjs/common';

export const REQUIRED_FEATURE = 'required-feature';
export const RequireFeature = (code: string) =>
  SetMetadata(REQUIRED_FEATURE, code);
