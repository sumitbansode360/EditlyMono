import AuthHeroSection from "@/components/auth/AuthHeroSection";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

type Props = {
  params: Promise<{
    uid: string;
    token: string;
  }>;
};

export default async function ResetPasswordPage({ params }: Props) {
  const { uid, token } = await params;

  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden border-r bg-muted/20 lg:flex">
          <AuthHeroSection />
        </section>

        <section className="flex items-center justify-center px-6 py-10">
          <ResetPasswordForm uid={uid} token={token} />
        </section>
      </div>
    </main>
  );
}
