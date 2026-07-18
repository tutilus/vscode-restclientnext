import type { BeforeRequestHook } from 'got';

async function login(
	username: string,
	password: string,
	userPoolId: string,
	clientId: string
): Promise<{
	authId: string;
	idToken: string;
	accessToken: string;
}> {
	// Dynamic import to avoid loading aws-amplify for all users
	const Amplify = (await import('aws-amplify')).Amplify;
	const { signIn, fetchAuthSession, getCurrentUser } = await import('aws-amplify/auth');

	Amplify.configure({
		Auth: {
			Cognito: {
				userPoolId,
				userPoolClientId: clientId,
				loginWith: {
					username: true,
				},
			},
		},
	});

	const user = await signIn({ username, password });
	if (user.isSignedIn) {
		const session = await fetchAuthSession();
		const authUser = await getCurrentUser();

		const authId = authUser.username;
		const idToken = session.tokens?.idToken?.toString();
		const accessToken = session.tokens?.accessToken?.toString();

		if (!idToken || !accessToken) {
			throw Error(`Invalid auth response: ${JSON.stringify(user, null, 2)}`);
		}

		return {
			authId,
			idToken,
			accessToken,
		};
	} else {
		throw Error(`Failed to sign in: ${JSON.stringify(user, null, 2)}`);
	}
}

export async function awsCognito(authorization: string): Promise<BeforeRequestHook> {
	const [, username, password, userPoolId, clientId] = authorization.split(/\s+/);

	const { accessToken } = await login(username, password, userPoolId, clientId);

	return async options => {
		options.headers = {
			...options.headers,
			Authorization: `Bearer ${accessToken}`,
		};
	};
}
