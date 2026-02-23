import aws4 from 'aws4';
import { BeforeRequestHook, Response} from 'got';

export function awsSignature(authorization: string): BeforeRequestHook {
    const [ , accessKeyId, secretAccessKey ] = authorization.split(/\s+/);
    const credentials = {
        accessKeyId,
        secretAccessKey,
        sessionToken: /token:(\S*)/.exec(authorization)?.[1]
    };

    const awsScope = {
        region: /region:(\S*)/.exec(authorization)?.[1],
        service: /service:(\S*)/.exec(authorization)?.[1]
    };

    return async options => {
        const result = aws4.sign({...options as any, ...awsScope}, credentials);
        return result as any as Response;
    };
}