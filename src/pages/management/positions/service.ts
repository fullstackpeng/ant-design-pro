import * as api from '@/services/backend/positions';
export type Position = BackendAPI.PositionDto;
export const listPositions = () =>
  api.listPositions({ skipErrorHandler: true });
export const createPosition = (body: BackendAPI.CreatePositionDto) =>
  api.createPosition(body, { skipErrorHandler: true });
export const updatePosition = (
  id: string,
  body: BackendAPI.UpdatePositionDto,
) => api.updatePosition({ id }, body, { skipErrorHandler: true });
export const deletePosition = (id: string) =>
  api.deletePosition({ id }, { skipErrorHandler: true });
