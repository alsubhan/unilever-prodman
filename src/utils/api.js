const API_BASE = '/api';

const getToken = () => localStorage.getItem('pms_token');

async function request(method, path, body) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status, data });
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
  // Auth
  login: (username, password) => request('POST', '/auth/login', { username, password }),
  me: () => request('GET', '/auth/me'),
  // Users
  getUsers: () => request('GET', '/users'),
  createUser: (data) => request('POST', '/users', data),
  updateUser: (id, data) => request('PUT', `/users/${id}`, data),
  deleteUser: (id) => request('DELETE', `/users/${id}`),
  // Raw Materials
  getRawMaterials: () => request('GET', '/raw-materials'),
  createRawMaterial: (data) => request('POST', '/raw-materials', data),
  updateRawMaterial: (id, data) => request('PUT', `/raw-materials/${id}`, data),
  deleteRawMaterial: (id) => request('DELETE', `/raw-materials/${id}`),
  // Packing Machines
  getPackingMachines: () => request('GET', '/packing-machines'),
  createPackingMachine: (data) => request('POST', '/packing-machines', data),
  updatePackingMachine: (id, data) => request('PUT', `/packing-machines/${id}`, data),
  deletePackingMachine: (id) => request('DELETE', `/packing-machines/${id}`),
  // Access Rights
  getAccessRights: () => request('GET', '/access-rights'),
  updateAccessRight: (data) => request('PUT', '/access-rights', data),
  // Production Plans
  getProductionPlans: () => request('GET', '/production-plans'),
  createProductionPlan: (data) => request('POST', '/production-plans', data),
  updateProductionPlan: (id, data) => request('PUT', `/production-plans/${id}`, data),
  submitPlan: (id) => request('POST', `/production-plans/${id}/submit`),
  approvePlan: (id) => request('POST', `/production-plans/${id}/approve`),
  rejectPlan: (id) => request('POST', `/production-plans/${id}/reject`),
  cancelPlan: (id) => request('POST', `/production-plans/${id}/cancel`),
  // Scan
  validateScan: (machine_barcode, material_barcode) => request('POST', '/scan/validate', { machine_barcode, material_barcode }),
  getMachineInfo: (code) => request('GET', `/scan/machine/${code}`),
  getScanHistory: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/scan/history${q ? '?' + q : ''}`);
  },
  // Reports
  getRawMaterialUsage: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/reports/raw-material-usage${q ? '?' + q : ''}`);
  },
  getDashboard: () => request('GET', '/reports/dashboard'),
  // Utility
  createBackup: () => request('POST', '/utility/backup'),
  getBackups: () => request('GET', '/utility/backups'),
  restoreBackup: (filename) => request('POST', '/utility/restore', { filename }),
};

export default api;
