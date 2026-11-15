import { hello } from '@/services/backend/health';

export const queryHello = () => hello({ skipErrorHandler: true });
