import { ModuleMainGasEstimatorCode } from "./moduleMainGasEstimatorCode";
import { ModuleMainUpgradableGasEstimatorCode } from "./moduleMainUpgradableGasEstimatorCode";
export interface UnipassWalletContext {
  moduleMain: string;
  moduleMainUpgradable: string;
  moduleGuest?: string;

  dkimKeys?: string;
  moduleWhiteList?: string;

  gasEstimator?: string;
  gasEstimatingDkimKeys?: string;
  moduleMainGasEstimatorCode?: string;
  moduleMainUpgradableGasEstimatorCode?: string;

  gasEstimatorDkimPrivateKey?: string;
}

export const unipassWalletContext: UnipassWalletContext = {
  moduleMain: "0x1039762670Eff9BC787a6a3Ec7c5b2dd1bB2c13b",
  moduleMainUpgradable: "0x11cd36987DD3e27A93AF1e349d7bB1815C939c1e",
  moduleGuest: "0xc978e3B8cb432273CF4Ff6C6c3C7590139c9F49e",

  dkimKeys: "0xe59C516F6eaE143B2563f8006D69dDC1f417bba3",
  moduleWhiteList: "0x40F589896987eF460CaD5f37460d717d2Bf6d3FE",

  gasEstimator: "0x6041ae26F00BCec8c04a27190cB75f400a6582d3",
  moduleMainGasEstimatorCode: ModuleMainGasEstimatorCode,
  moduleMainUpgradableGasEstimatorCode: ModuleMainUpgradableGasEstimatorCode,

  gasEstimatorDkimPrivateKey: `-----BEGIN PRIVATE KEY-----
  MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCkN98ak9zFw91t
  5LYfE0OPEcgv4JlZxnAPA9UYzyFPYMKfqIz/OZOBDdzED3EteBBJETG6on8lKW+N
  UQHA3ShDFq+qpr+R3Z4RSdjX/xt7ny+xPzOmp5S9Dl2DZqRk6rZabzK7gwtKO58H
  7NHwRkCU5vkgYzzVtExlrd4OGDgnjI830diaNY2N0luW8z5v7/wpEEdyClXgCsDY
  qXR9fZDvod34p9LlV07FelDqZm+642MoYGxFIDJXqO/XyK3Yxy2bBFlGb/7UJ+Y2
  T8I3wOxpEonjI2LaQXQqLwiE7jprnH+lvNy68xqvO0uq1g6DKN0PgJdsmD/aXnaS
  YFqVDR5dAgMBAAECggEAXsTzlwXv6Z2QIwRTafmXCnDLo32tYhbXwoKGrwuSAJop
  lzQRMpVKn7adSfRTb1cTpucqWLfAQnT4MIioR2IaAyWLeSND+Oz5dKa2YmiRtrT2
  NAbySuH5P2WT5+oLQ0YEuInlsDr+//cKXut3eH9Cc+wbp2o9yGKFmERPmri1Z3SS
  iFMnmNc57f39ga2sSeciFURF/LuQsmjsxMEGalog+CslFAcgKd4hwSuye9vy/O0Z
  r095giIyFzglz3iebZZlIhFBhMsNnH/KjpbGgQaf4fx3jTAJVWLAE1aVOVTurjnc
  6cgpfdpayWJfmoDnOOq1DLwedUEVuOipqUEVHkaJgQKBgQDsLFrd9UE6omMaBXY3
  urbDJMNXZYvGFp0rwVIsKfmbidHFd/OOhaAcqqLsD5mP7cy8fwscQPauc7ylc8gm
  rGsMWECQKpOplqkyGcyi88CieQpoGqIlIYJRr7+7dtF/E+nFTPPOvA4IizyLmZxv
  Dg9vzuf9IRMZUPXvEug6oOkivQKBgQCyAR4UQ5ZjmmSnJhnwZO/Sn6I1WNQN9nu2
  2xLXwMQK7wxLi2d2B4DpwHuLcH6YTc1Ox8Hx8Lzo0qCWxYJp7lUc1nLxVcUghYnd
  ZCnnJcA1vFD66arpoYQKY0SKBYkC03XsauCutJh1RTcGiY5bDBANZACONdYSIQul
  HJYupWp0IQKBgDw9JAAxKi4WdUiR1BFq4mrr2ZdVI02nPveGG7uACVaO1J6Vdd4I
  X0pwi5XCdNytPudlUCQovcLJaniZC5gxqiw/5lffREKhVw6cXgHCQoQuc2USRgFK
  hr7nIPRj3hOXtKzKb/VvKfUr7ol86NW6tF1EXQ/He+OdLt2H6QvrNwvRAoGAJclG
  8VZHnm0v4Kud5gIHRtbMQDbTDQO9z1tB7Lrm4stL+N1m4Q9Gtlg94aPHu90IMCkH
  aqyH7YSIwni67nHBb5W2YLSsW/L9CRoyKvdAjiejqR/hQCchOHNKIWJ7azYoWj91
  4qBDnOFMhP6+UWWGItGPrKCRCNgq+KnQ16YVqwECgYEAgzgCDZy02ucuMQgxMt8s
  lJ1NLA7rRgbanyZJ2jFH6REiMHVLQr5epz53jkEJrPyhgEJ9VlTHTW1OZcEdtj1m
  U3qZBX/TQmy2AVYcAcOLy3bhDrP0oztmpepJqWAjMdCP/i2lYBbwCfXtajW05Qic
  gC9a5BZWOz9k5Ud4vPZpat4=
  -----END PRIVATE KEY-----`,
};
