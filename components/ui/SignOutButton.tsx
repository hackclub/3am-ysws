import { Button } from "./Button";

export function SignOutButton() {
  return (
    <form action="/api/auth/logout" method="post">
      <Button type="submit" variant="quiet">
        sign out
      </Button>
    </form>
  );
}
