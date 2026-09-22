import { login } from "./actions";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--lienzo)]">
      <form action={login} className="w-full max-w-[360px] rounded-[14px] border border-[color:var(--hairline)] bg-white p-[30px]">
        <div className="font-[var(--display)] text-[20px] font-bold tracking-[-0.02em]">
          Bloqbase — Panel ejecutivo
        </div>
        <div className="mt-[22px]">
          <label className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[rgba(26,26,24,0.58)]">
            Email
          </label>
          <input
            name="email"
            type="email"
            required
            className="mt-[8px] w-full border-b border-[color:var(--borde-input)] bg-transparent py-[10px] text-[15.5px] outline-none focus:border-[color:var(--naranja)]"
          />
        </div>
        <div className="mt-[22px]">
          <label className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[rgba(26,26,24,0.58)]">
            Contraseña
          </label>
          <input
            name="password"
            type="password"
            required
            className="mt-[8px] w-full border-b border-[color:var(--borde-input)] bg-transparent py-[10px] text-[15.5px] outline-none focus:border-[color:var(--naranja)]"
          />
        </div>
        <button
          type="submit"
          className="mt-[26px] w-full rounded-[10px] bg-[color:var(--naranja)] px-[22px] py-[14px] font-mono text-[11.5px] font-bold uppercase tracking-[0.16em] text-white hover:bg-[color:var(--naranja-hover)]"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
