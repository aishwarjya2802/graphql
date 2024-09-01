const API_AUTH_ENDPOINT = 'https://01.kood.tech/api/auth/signin';
const API_GRAPHQL_ENDPOINT = 'https://01.kood.tech/api/graphql-engine/v1/graphql';

/**
 * Authenticates a user with the provided credentials.
 * 
 * @param {string} user - The username to authenticate.
 * @param {string} pass - The password to authenticate.
 * @returns {Promise<object|null>} - A promise resolving to the authentication response data, or null on error.
 */
export async function authenticateUser(user, pass) {
  const authToken = `Bearer ${btoa(`${user}:${pass}`)}`;

  try {
    const response = await fetch(API_AUTH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken,
      },
    });

    if (!response.ok) {
      throw new Error('Error with login response');
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
 * Sends a GraphQL query to the API with the provided authentication token.
 * 
 * @param {string} graphQLQuery - The GraphQL query to send.
 * @param {string} authToken - The authentication token to use.
 * @returns {Promise<object|null>} - A promise resolving to the query response data, or null on error.
 */
export async function performRequest(graphQLQuery, authToken) {
  try {
    const response = await fetch(API_GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ query: graphQLQuery }),
    });

    if (!response.ok) {
      throw new Error('Error with token response');
    }

    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}
