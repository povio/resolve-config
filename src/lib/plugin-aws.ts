const SSMRegEx =
  /arn:aws:ssm:(?<region>[^:]+)?:(?<accountId>\d+)?:parameter\/(?<path>.*)/;

const SecretsManagerRegEx =
  /arn:aws:secretsmanager:(?<region>[^:]+)?:(?<accountId>\d+)?:secret:(?<path>.*)/;

export async function getCredentials(config: {
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  region?: string;
}) {
  const { fromNodeProviderChain } = await import(
    "@aws-sdk/credential-providers"
  );

  return await fromNodeProviderChain({
    //...any input of fromEnv(), fromSSO(), fromTokenFile(), fromIni(),
    // fromProcess(), fromInstanceMetadata(), fromContainerMetadata()
    // Optional. Custom STS client configurations overriding the default ones.
    clientConfig: config,
  });
}

export async function getSSMInstance(config: {
  region?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  endpoint?: string;
}) {
  const { SSMClient } = await import("@aws-sdk/client-ssm");
  return new SSMClient({
    credentials: config.credentials
      ? config.credentials
      : await getCredentials({
          credentials: config.credentials,
          region: config.region,
        }),
    region: config.region,
    endpoint: config.endpoint,
  });
}

export async function getSecretsManagerInstance(config: {
  region?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  };
  endpoint?: string;
}) {
  const { SecretsManagerClient } = await import(
    "@aws-sdk/client-secrets-manager"
  );
  return new SecretsManagerClient({
    credentials: config.credentials
      ? config.credentials
      : await getCredentials({
          credentials: config.credentials,
          region: config.region,
        }),
    region: config.region,
    endpoint: config.endpoint,
  });
}

async function resolveSsmArn(
  path: string,
  config?: {
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    };
    accountId?: string;
    region?: string;
    endpoint?: string;
  },
) {
  const { GetParameterCommand } = await import("@aws-sdk/client-ssm");

  const ssm = await getSSMInstance({
    credentials: config?.credentials,
    region: config?.region,
    endpoint: config?.endpoint,
  });

  let response;
  const Name =
    config?.accountId && config.region
      ? `arn:aws:ssm:${config.region}:${config.accountId}:parameter/${path}`
      : `/${path}`;

  try {
    response = await ssm.send(
      new GetParameterCommand({
        Name,
        WithDecryption: true,
      }),
    );
  } catch (e) {
    throw new Error(`Could not get parameter ${Name}`, { cause: e });
  }
  if (!response.Parameter?.Value) {
    throw new Error("Could not get parameter");
  }
  return response.Parameter.Value;
}

async function resolveSecretsManagerArn(
  name: string,
  config?: {
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    };
    accountId?: string;
    region?: string;
    endpoint?: string;
  },
) {
  const { GetSecretValueCommand } = await import(
    "@aws-sdk/client-secrets-manager"
  );

  const secretsManager = await getSecretsManagerInstance({
    credentials: config?.credentials,
    region: config?.region,
    endpoint: config?.endpoint,
  });

  const SecretId =
    config?.accountId && config.region
      ? `arn:aws:secretsmanager:${config.region}:${config.accountId}:secret:${name}`
      : name;

  let response;
  try {
    response = await secretsManager.send(
      new GetSecretValueCommand({
        SecretId,
      }),
    );
  } catch (e) {
    throw new Error(`Could not get secret ${SecretId}`, { cause: e });
  }
  if (!response.SecretString) {
    throw new Error("Could not get secret");
  }
  return response.SecretString;
}

export async function resolveAwsArn(
  name: string,
  config?: {
    credentials?: {
      accessKeyId: string;
      secretAccessKey: string;
      sessionToken?: string;
    };
    accountId?: string;
    region?: string;
    endpoint?: string;
  },
) {
  const ssmMatch = name.match(SSMRegEx);
  if (ssmMatch) {
    return await resolveSsmArn(name, {
      ...config,
      region:
        ssmMatch?.groups?.region || config?.region || process.env.AWS_REGION,
      accountId: ssmMatch.groups?.accountId,
    });
  }

  const secretMatch = name.match(SecretsManagerRegEx);
  if (secretMatch) {
    return await resolveSecretsManagerArn(secretMatch!.groups!.path, {
      ...config,
      region:
        secretMatch?.groups?.region || config?.region || process.env.AWS_REGION,
      accountId: secretMatch.groups?.accountId,
    });
  }

  throw new Error(`Could not resolve arn: '${name}'`);
}
