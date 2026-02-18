import client from "./client";

export const researchApi = {
  // Population overview
  getStats: () => client.get("/api/v1/research/stats"),

  // Patient registry
  listPatients: () => client.get("/api/v1/research/patients"),
  getPatientSummary: (id) =>
    client.get(`/api/v1/research/patients/${id}/summary`),
  getPatientRecalls: (id) =>
    client.get(`/api/v1/research/patients/${id}/recalls`),
  getPatientPlans: (id) => client.get(`/api/v1/research/patients/${id}/plans`),

  // CSV exports
  exportPatients: () =>
    client.get("/api/v1/research/export/patients", { responseType: "blob" }),
  exportTimeseries: (params = {}) =>
    client.get("/api/v1/research/export/dietary-timeseries", {
      params,
      responseType: "blob",
    }),
};
