import { listLoginTenants } from '@/services/backend/auth';
import { hello } from '@/services/backend/health';

export const queryHello = () => hello({ skipErrorHandler: true });

export const queryLoginTenants = (
  params: BackendAPI.listLoginTenantsParams = {},
) => listLoginTenants(params, { skipErrorHandler: true });
