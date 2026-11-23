import * as api from '@/services/backend/departments';
export type Department = BackendAPI.DepartmentDto;
export const listDepartments = () =>
  api.listDepartments({ skipErrorHandler: true });
export const createDepartment = (body: BackendAPI.CreateDepartmentDto) =>
  api.createDepartment(body, { skipErrorHandler: true });
export const updateDepartment = (
  id: string,
  body: BackendAPI.UpdateDepartmentDto,
) => api.updateDepartment({ id }, body, { skipErrorHandler: true });
export const deleteDepartment = (id: string) =>
  api.deleteDepartment({ id }, { skipErrorHandler: true });
