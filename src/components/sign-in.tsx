import { signIn } from "@/auth";

// Official Auth.js documentation version - Simple Resend signin
export function SimpleSignIn() {
  return (
    <form
      action={async (formData) => {
        "use server";
        await signIn("resend", formData);
      }}
    >
      <input
        type="email"
        name="email"
        placeholder="Email"
        required
        className="border border-gray-300 rounded px-3 py-2 mb-2"
      />
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Signin with Resend
      </button>
    </form>
  );
}

export function SignInWithGoogle() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("google");
      }}
    >
      <button
        type="submit"
        className="flex w-full items-center justify-center space-x-2 border border-gray-300 bg-gray-100 font-normal text-gray-900 hover:bg-gray-200 px-4 py-2 rounded"
      >
        <span>Continue with Google</span>
      </button>
    </form>
  );
}

export function SignInWithEmail() {
  return (
    <form
      action={async (formData) => {
        "use server";
        await signIn("resend", formData);
      }}
    >
      <input
        type="email"
        name="email"
        placeholder="name@example.com"
        required
        className="flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm ring-1 ring-gray-200 mb-2"
      />
      <button
        type="submit"
        className="w-full bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded"
      >
        Continue with Email
      </button>
    </form>
  );
}

export default function SignIn() {
  return (
    <div className="space-y-4">
      <SignInWithEmail />
      <div className="text-center">or</div>
      <SignInWithGoogle />
    </div>
  );
}
