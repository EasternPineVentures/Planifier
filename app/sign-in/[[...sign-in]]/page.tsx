import { SignIn } from "@clerk/nextjs";
import AuthFrame from "@/components/AuthFrame";
import { planifierClerkAppearance } from "@/lib/auth/clerkAppearance";

export default function Page() {
  return (
    <AuthFrame mode="sign-in">
      <SignIn
        appearance={planifierClerkAppearance}
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
      />
    </AuthFrame>
  );
}
