import client from "./client";

export const dietaryApi = {
  searchFoods: (q, params = {}) =>
    client.get("/api/v1/dietary/foods/search", {
      params: { q, limit: 15, ...params },
    }),

  getCategories: () => client.get("/api/v1/dietary/foods/categories"),

  createRecall: (data) => client.post("/api/v1/dietary/recall", data),

  listRecalls: (params = {}) =>
    client.get("/api/v1/dietary/recall", { params }),

  getRecall: (id) => client.get(`/api/v1/dietary/recall/${id}`),

  deleteRecall: (id) => client.delete(`/api/v1/dietary/recall/${id}`),

  submitFFQ: (data) => client.post("/api/v1/dietary/ffq", data),

  listFFQ: () => client.get("/api/v1/dietary/ffq"),
};
