import axiosInstance from "@/lib/axios";
import { RoleResponse } from "@/types";

export const getRoles = async (): Promise<RoleResponse[]> => {
  const { data } = await axiosInstance.get("/roles");
  return data;
};
