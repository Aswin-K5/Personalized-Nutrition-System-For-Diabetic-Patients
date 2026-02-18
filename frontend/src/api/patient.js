import client from "./client";

export const patientApi = {
  createProfile: (data) => client.post("/api/v1/patients/profile", data),
  getProfile: () => client.get("/api/v1/patients/profile"),
  updateProfile: (data) => client.put("/api/v1/patients/profile", data),
  getSummary: () => client.get("/api/v1/patients/profile/summary"),
};
