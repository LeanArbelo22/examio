import { LoginForm } from "@/components/forms/LoginForm";

export default function LoginPage() {
  return (
    <div className='min-h-[calc(100vh-5rem)] bg-gradient-to-br from-slate-50 via-slate-50 to-indigo-50/50 p-6 flex flex-col justify-center items-center flex-grow selection:bg-indigo-100 antialiased'>
      <LoginForm />
    </div>
  );
}