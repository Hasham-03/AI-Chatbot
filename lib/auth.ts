
import { Amplify } from "aws-amplify";

export function configureAuth() {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId: "ap-south-1_qO40LWCiF",
        userPoolClientId: "4qoamrdng75ps0dl7qsn8ggbr3",
        loginWith: {
          oauth: {
            domain: "ap-south-1qo40lwcif.auth.ap-south-1.amazoncognito.com",
            scopes: ["email", "openid", "profile"],
            redirectSignIn: ["http://localhost:3000"],
            redirectSignOut: ["http://localhost:3000"],
            responseType: "code",
          },
        },
      },
    },
  });
}