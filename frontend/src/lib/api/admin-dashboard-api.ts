import { adminApiClient } from "./admin-client";
import { AdminOverviewResponse } from "@/types/admin-stats";

export const adminDashboardApi = {
  getOverviewStats: () =>
    adminApiClient<AdminOverviewResponse>("/admin/stats/overview", {
      method: "GET",
    }),
};
