import axiosInstance from "@/lib/axios";
import {
  FeatureCreate,
  FeatureResponse,
  FeatureUpdate,
  PaginatedResponse,
} from "@/types";

export const getFeatures = async (
  projectId: string,
  page = 1,
  size = 20
): Promise<PaginatedResponse<FeatureResponse>> => {
  const { data } = await axiosInstance.get(`/projects/${projectId}/features`, {
    params: { page, size },
  });
  return data;
};

export const getFeature = async (
  projectId: string,
  featureId: string
): Promise<FeatureResponse> => {
  const { data } = await axiosInstance.get(`/projects/${projectId}/features/${featureId}`);
  return data;
};

export const createFeature = async (
  projectId: string,
  payload: FeatureCreate
): Promise<FeatureResponse> => {
  const { data } = await axiosInstance.post(`/projects/${projectId}/features`, payload);
  return data;
};

export const updateFeature = async (
  projectId: string,
  featureId: string,
  payload: FeatureUpdate
): Promise<FeatureResponse> => {
  const { data } = await axiosInstance.patch(
    `/projects/${projectId}/features/${featureId}`,
    payload
  );
  return data;
};

export const deleteFeature = async (projectId: string, featureId: string, deleteRemote = false): Promise<void> => {
  await axiosInstance.delete(`/projects/${projectId}/features/${featureId}`, {
    params: { delete_remote: deleteRemote },
  });
};
