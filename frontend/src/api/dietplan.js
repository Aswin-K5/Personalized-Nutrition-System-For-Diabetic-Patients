import client from "./client";

export const dietPlanApi = {
  generate: (data) => client.post("/api/v1/diet-plan/generate", data),

  compare: () => client.get("/api/v1/diet-plan/compare"),

  history: (params = {}) => client.get("/api/v1/diet-plan/history", { params }),

  getPlan: (id) => client.get(`/api/v1/diet-plan/${id}`),
};
