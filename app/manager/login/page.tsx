import { redirect } from "next/navigation";
import Link from "next/link";
import { getManagerUser, isManagerAuthConfigured } from "../../../lib/auth.server";
import { safeManagerReturnPath } from "../../../lib/manager-auth";
import { region } from "../../../config/regions";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ManagerLoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const copy = region.presentation.copy;
  const returnTo = safeManagerReturnPath(singleValue(params.return_to) ?? "/manager");
  const user = await getManagerUser();
  if (user) redirect(returnTo);

  const configured = await isManagerAuthConfigured();
  const error = singleValue(params.error);

  return (
    <main className="manager-login-page">
      <section className="manager-login-card" aria-labelledby="manager-login-title">
        <p className="eyebrow">{region.siteName.toUpperCase()} / MANAGER</p>
        <h1 id="manager-login-title">{copy.managerSignInTitle}</h1>
        <p className="muted">{copy.managerSignInIntroduction}</p>

        {!configured ? (
          <div className="manager-login-message error" role="alert">
            {copy.managerMissingConfiguration}
          </div>
        ) : (
          <form className="manager-login-form" action="/api/manager/session" method="post">
            <input type="hidden" name="action" value="login" />
            <input type="hidden" name="return_to" value={returnTo} />
            <label htmlFor="manager-email">{copy.managerEmailLabel}</label>
            <input
              id="manager-email"
              name="email"
              type="email"
              autoComplete="username"
              required
            />
            <label htmlFor="manager-password">{copy.managerPasswordLabel}</label>
            <input
              id="manager-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            {error === "invalid" && (
              <div className="manager-login-message error" role="alert">
                {copy.managerInvalidCredentials}
              </div>
            )}
            <button className="button primary" type="submit">
              {copy.managerSignInAction} <span>→</span>
            </button>
          </form>
        )}
        <Link className="text-link manager-login-back" href="/">{copy.managerBackLink}</Link>
      </section>
    </main>
  );
}

function singleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
