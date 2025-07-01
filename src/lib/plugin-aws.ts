
const SSMRegEx =
  /arn:aws:ssm:(?<region>[^:]+)?:(?<accountId>\d+)?:parameter\/(?<path>.*)/;


export async function getCredentials(config: {
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  }
  region?: string;
}) {
  const { fromNodeProviderChain } = await import("@aws-sdk/credential-providers");
  return await fromNodeProviderChain({
    //...any input of fromEnv(), fromSSO(), fromTokenFile(), fromIni(),
    // fromProcess(), fromInstanceMetadata(), fromContainerMetadata()
    // Optional. Custom STS client configurations overriding the default ones.
    clientConfig: config
  });
}


export async function getSSMInstance(config: { region?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  }
  endpoint?: string;
}) {
  const { SSMClient } = await import("@aws-sdk/client-ssm");

  return new SSMClient({
    credentials: config.credentials ? config.credentials : await getCredentials({ credentials: config.credentials, region: config.region }),
    region: config.region,
    endpoint: config.endpoint,
  });
}


export async function resolveAwsArn(name: string, config: {
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  }
  accountId?: string;
  region?: string;
  endpoint?: string;
}) {

  console.log(config);

  const { GetParameterCommand } = await import("@aws-sdk/client-ssm");

  const match = name.match(SSMRegEx);
  if (!match?.groups?.path) {
    throw new Error(`Could not parse parameter arn: '${name}'`);
  }
  
  const region = match?.groups?.region || config.region || process.env.AWS_REGION;

  const ssm = await getSSMInstance({ credentials: config.credentials, region, endpoint: config.endpoint });

  let response;
  try {
    response = await ssm.send(
      new GetParameterCommand({
        Name: `/${match.groups.path}`,
        WithDecryption: true,
      }),
    );
  } catch (e) {
    throw new Error(`Could not get parameter ${name}`, { cause: e });
  }
  if (!response.Parameter?.Value) {
    throw new Error("Could not get parameter");
  }
  return response.Parameter.Value;
}
