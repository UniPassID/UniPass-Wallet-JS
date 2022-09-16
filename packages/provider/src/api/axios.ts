import axios, { AxiosResponse } from "axios";
import WalletError from "../constant/error_map";

const API_VERSION_PREFIX = "/api/v1";
const DEFAULT_TIMEOUT = 10 * 60 * 1000;

export default function requestFactory(backendUrl: string) {
  console.log(`backendUrl: ${backendUrl}`);

  const instance = axios.create({
    baseURL: backendUrl + API_VERSION_PREFIX,
    timeout: DEFAULT_TIMEOUT,
  });
  //   instance.interceptors.request.use((config: AxiosRequestConfig) => {
  //     const headers = { ...config.headers };
  //     if (localStorage.getItem("token")) {
  //       headers["access-token"] = localStorage.getItem("token") || "";
  //     }
  //     return {
  //       ...config,
  //       headers,
  //     };
  //   });
  instance.interceptors.response.use(
    (response) => initResponse(response),
    (error) => initResponse(error.response),
  );

  return instance;
}

export const initResponse = (response: AxiosResponse) => {
  if (response.status >= 400) {
    throw new WalletError(response.status);
  }

  if (!response.data?.statusCode) {
    throw new WalletError(404);
  } else if (response.data.statusCode !== 200) {
    throw new WalletError(response.data?.statusCode, response.data?.message);
  }

  return response.data;
};
