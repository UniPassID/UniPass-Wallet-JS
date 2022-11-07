import dayjs from "dayjs";
import jwt_decode from "jwt-decode";
import { AccountInfo, IdTokenParams, LocalUserInfo } from "../interface";

const LocalStorageKeys = {
  OAUTH_INFO: "__oauth_info",
  ACCOUNT_INFO: "__account_info",
  OAUTH_ORIGIN_FORM: "__oauth_origin_form",
};

type StorageKeys = keyof typeof LocalStorageKeys;

const genStorage = ($storage: Storage) => {
  const get = (key: StorageKeys) => {
    let value = $storage.getItem(LocalStorageKeys[key]) || "";
    try {
      value = JSON.parse(value);
      return value;
    } catch {
      return value;
    }
  };

  const set = (key: StorageKeys, value: any) => {
    return $storage.setItem(LocalStorageKeys[key], value ? JSON.stringify(value) : value);
  };

  const remove = (key: StorageKeys) => {
    return $storage.removeItem(LocalStorageKeys[key]);
  };

  const clearAll = () => {
    Reflect.ownKeys($storage).forEach((key) => {
      if (typeof key === "string") $storage.removeItem(key);
    });
  };

  return {
    get,
    set,
    remove,
    clearAll,
  };
};

const SessionStorageService = genStorage(window.sessionStorage || sessionStorage);
const LocalStorageService = genStorage(window.localStorage || localStorage);

const getAccountInfo = () => {
  try {
    const _account_info = LocalStorageService.get("ACCOUNT_INFO");
    if (!_account_info) {
      return;
    }
    const accountInfo = JSON.parse(_account_info) as AccountInfo;
    const { exp } = jwt_decode<IdTokenParams>(accountInfo.id_token);
    if (dayjs(exp * 1000).isBefore(dayjs())) {
      return;
    }
    return accountInfo;
  } catch (e) {
    return undefined;
  }
};

const getLocalUserInfo = () => {
  try {
    const _local_user_info = LocalStorageService.get("OAUTH_INFO");
    if (!_local_user_info) {
      return;
    }
    return JSON.parse(_local_user_info) as LocalUserInfo;
  } catch (e) {
    return undefined;
  }
};

export { SessionStorageService, LocalStorageService, getAccountInfo, getLocalUserInfo };
