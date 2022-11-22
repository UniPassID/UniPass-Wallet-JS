import axios, { AxiosResponse } from "axios";
import WalletError from "../constant/error_map";
import { getOAuthUserInfo } from "../utils/storages";

const API_VERSION_PREFIX = "/api/v1";
const DEFAULT_TIMEOUT = 10 * 60 * 1000;

export default function requestFactory(backendUrl: string) {
  console.log(`backendUrl: ${backendUrl}`);
  const instance = axios.create({
    baseURL: backendUrl + API_VERSION_PREFIX,
    timeout: DEFAULT_TIMEOUT,
  });
  instance.interceptors.request.use(
    (config) => {
      try {
        const oauthUserInfo = getOAuthUserInfo();
        if (oauthUserInfo?.authorization) {
          config.headers = {
            ...config?.headers,
            Authorization: `Bearer ${oauthUserInfo?.authorization}`,
          };
        }
      } catch (e) {
        console.error(e);
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
