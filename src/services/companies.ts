import axiosInstance from "@/lib/axios";
import { CompanyCreate, CompanyResponse, CompanyUpdate, PaginatedResponse } from "@/types";

export const getCompanies = async (
  page = 1,
  size = 10
): Promise<PaginatedResponse<CompanyResponse>> => {
  const { data } = await axiosInstance.get("/companies", { params: { page, size } });
  return data;
};

export const getCompany = async (id: string): Promise<CompanyResponse> => {
  const { data } = await axiosInstance.get(`/companies/${id}`);
  return data;
};

export const createCompany = async (payload: CompanyCreate): Promise<CompanyResponse> => {
  const { data } = await axiosInstance.post("/companies", payload);
  return data;
};

export const updateCompany = async (
  id: string,
  payload: CompanyUpdate
): Promise<CompanyResponse> => {
  const { data } = await axiosInstance.patch(`/companies/${id}`, payload);
  return data;
};

export const deleteCompany = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/companies/${id}`);
};
