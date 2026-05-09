import axiosInstance from "@/lib/axios";
import { PaginatedResponse, UserCreate, UserResponse, UserUpdate } from "@/types";

export const getUsers = async (
  page = 1,
  size = 10
): Promise<PaginatedResponse<UserResponse>> => {
  const { data } = await axiosInstance.get("/users", { params: { page, size } });
  return data;
};

export const getUser = async (id: string): Promise<UserResponse> => {
  const { data } = await axiosInstance.get(`/users/${id}`);
  return data;
};

export const createUser = async (payload: UserCreate): Promise<UserResponse> => {
  const { data } = await axiosInstance.post("/users", payload);
  return data;
};

export const updateUser = async (
  id: string,
  payload: UserUpdate
): Promise<UserResponse> => {
  const { data } = await axiosInstance.patch(`/users/${id}`, payload);
  return data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await axiosInstance.delete(`/users/${id}`);
};
