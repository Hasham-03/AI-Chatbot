
import { Amplify } from "aws-amplify";

export function configureAuth() {
  // Dynamically set redirect URIs based on current domain
  const redirectUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://main.d33idnq08aawk7.amplifyapp.com';

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID || "ap-south-1_qO40LWCiF",
        userPoolClientId: process.env.NEXT_PUBLIC_CLIENT_ID || "4qoamrdng75ps0dl7qsn8ggbr3",
        loginWith: {
          oauth: {
            domain: "ap-south-1qo40lwcif.auth.ap-south-1.amazoncognito.com",
            scopes: ["email", "openid", "profile"],
            redirectSignIn: [redirectUrl],
            redirectSignOut: [redirectUrl],
            responseType: "code",
          },
        },
      },
    },
  });
}