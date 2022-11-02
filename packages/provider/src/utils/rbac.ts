import { Keyset, KeyEmailDkim, KeySecp256k1, SignType, RoleWeight, OpenIDOptions } from "@unipasswallet/keys";

import { Weight } from "./weight";

export interface ISendRecoveryAction {
  canSendStartRecoveryTx: boolean;
  isHaveTimeLock: boolean;
  isPolicy: boolean;
}

export function getAccountKeysetJson(
  // guardians: GuardianData[],
  email: string,
  openIDOptionsOrOpenIDHash: OpenIDOptions | string,
  masterKeyAddress: string,
  policyAddress: string,
  pepper: string,
): Keyset {
  const weight = new Weight();
  const masterWeight = weight.getMasterKeyWeight();
  const policyWeight = weight.getPolicyWeight();

  const masterKeyData = new KeySecp256k1(
    masterKeyAddress,
    new RoleWeight(masterWeight.ownerWeight, masterWeight.assetsOpWeight, masterWeight.guardianWeight),
    SignType.EthSign,
    async () => Promise.resolve(""),
  );
  const policyData = new KeySecp256k1(
    policyAddress,
    new RoleWeight(policyWeight.ownerWeight, policyWeight.assetsOpWeight, policyWeight.guardianWeight),
    SignType.EthSign,
    async () => Promise.resolve(""),
  );

  const guardiansList: KeyEmailDkim[] = [];

  // for (const item of guardians) {
  //   let emailRoleWeight = guardians.length < 2 ? weight.getOneGuardianWeight() : weight.getMoreGuardianWeight();

  //   if (item.isSelfGuardian === true) {
  //     emailRoleWeight = weight.getSelfGuardianlWeight();
  //   }

  //   const keyBase = new KeyEmailDkim(
  //     item.email,
  //     pepper,
  //     new RoleWeight(emailRoleWeight.ownerWeight, emailRoleWeight.assetsOpWeight, emailRoleWeight.guardianWeight),
  //   );
  //   guardiansList.push(keyBase);
  // }

  const getRegisterWeight = weight.getRegisterEmailWeight();
  const keysetData = Keyset.create(
    email,
    pepper,
    openIDOptionsOrOpenIDHash,
    masterKeyData,
    guardiansList,
    policyData,
    new RoleWeight(getRegisterWeight.ownerWeight, getRegisterWeight.assetsOpWeight, getRegisterWeight.guardianWeight),
  );

  return keysetData;
}
