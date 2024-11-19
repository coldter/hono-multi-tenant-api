import type { App } from "@/pkg/hono/app";
import { registerV1ApiAuthUserCheckEmail } from "@/routes/auth/v1_api_auth_user_check_email";
import { registerV1ApiAuthUserSignup } from "@/routes/auth/v1_api_auth_user_signup";
import { registerV1ApiUserCheckMobile } from "@/routes/auth/v1_api_user_check_mobile";
import { registerV1ApiUserLoginWithEmailAndPass } from "@/routes/auth/v1_api_user_login_with_email_and_pass";
import { registerV1ApiUserLoginWithMobile } from "@/routes/auth/v1_api_user_login_with_mobile";

export const setupAuthApiRoutes = (app: App) => {
  registerV1ApiUserLoginWithMobile(app);
  registerV1ApiUserCheckMobile(app);
  registerV1ApiUserLoginWithEmailAndPass(app);
  registerV1ApiAuthUserSignup(app);
  registerV1ApiAuthUserCheckEmail(app);
};
