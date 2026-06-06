import axiosInstance from "@/lib/axios";
import {
  FeatureCreate,
  FeatureGenerateRequest,
  FeatureRefineRequest,
  FeatureResponse,
  FeatureUpdate,
  PaginatedResponse,
} from "@/types";

export const getFeatures = async (
  epicId: string,
  page = 1,
  size = 20
): Promise<PaginatedResponse<FeatureResponse>> => {
  const { data } = await axiosInstance.get(`/epics/${epicId}/features`, {
    params: { page, size },
  });
  return data;
};

export const getFeature = async (
  epicId: string,
  featureId: string
): Promise<FeatureResponse> => {
  const { data } = await axiosInstance.get(`/epics/${epicId}/features/${featureId}`);
  return data;
};

export const createFeature = async (
  epicId: string,
  payload: FeatureCreate
): Promise<FeatureResponse> => {
  const { data } = await axiosInstance.post(`/epics/${epicId}/features`, payload);
  return data;
};

export const updateFeature = async (
  epicId: string,
  featureId: string,
  payload: FeatureUpdate
): Promise<FeatureResponse> => {
  const { data } = await axiosInstance.patch(
    `/epics/${epicId}/features/${featureId}`,
    payload
  );
  return data;
};

export const deleteFeature = async (
  epicId: string,
  featureId: string,
  deleteRemote = false
): Promise<void> => {
  await axiosInstance.delete(`/epics/${epicId}/features/${featureId}`, {
    params: { delete_remote: deleteRemote },
  });
};

export const generateFeatures = async (
  epicId: string,
  payload: FeatureGenerateRequest = {}
): Promise<FeatureResponse[]> => {
  const { data } = await axiosInstance.post(`/epics/${epicId}/features/generate`, payload);
  return data;
};

export const refineFeature = async (
  epicId: string,
  featureId: string,
  payload: FeatureRefineRequest = {}
): Promise<FeatureResponse> => {
  const { data } = await axiosInstance.post(
    `/epics/${epicId}/features/${featureId}/refine`,
    payload
  );
  return data;
};
