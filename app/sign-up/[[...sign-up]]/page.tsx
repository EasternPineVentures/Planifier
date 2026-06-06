import { SignUp } from "@clerk/nextjs";
import AuthFrame from "@/components/AuthFrame";
import { planifierClerkAppearance } from "@/lib/auth/clerkAppearance";

export default function Page() {
  return (
    <AuthFrame mode="sign-up">
      <SignUp
        appearance={planifierClerkAppearance}
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
      />
    </AuthFrame>
  );
}
