import axios, { AxiosResponse } from "axios";
import WalletError from "../constant/error_map";
import { LocalStorageService } from "../utils/storages";

const API_VERSION_PREFIX = "/api/v1";
const DEFAULT_TIMEOUT = 10 * 60 * 1000;

export default function requestFactory(backendUrl: string) {
  console.log(`backendUrl: ${backendUrl}`);
  const instance = axios.create({
    baseURL: backendUrl + API_VERSION_PREFIX,
    timeout: DEFAULT_TIMEOUT,
  });
  axios.interceptors.request.use(
    (config) => {
      try {
        const _local_user_info = LocalStorageService.get("OAUTH_INFO");
        const local_user_info = JSON.parse(_local_user_info);
        if (local_user_info?.up_jwt_token?.authorization) {
          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${local_user_info?.up_jwt_token?.authorization}`,
          };
        }
      } catch (e) {
        //
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );
  instance.interceptors.response.use(
    (response) => initResponse(response),
    (error) => initResponse(error.response),
  );

  return instance;
}

export const initResponse = (response: AxiosResponse) => {
  // if (response.status >= 400) {
  //   throw new WalletError(response.status);
  // }
  if (!response.data?.statusCode) {
    throw new WalletError(404);
  } else if (response.data.statusCode !== 200) {
    throw new WalletError(response.data?.statusCode, response.data?.message);
  }
  return response.data;
};
