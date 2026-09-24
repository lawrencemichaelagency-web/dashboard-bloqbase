import { login } from "./actions";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[color:var(--lienzo)]">
      <form action={login} className="bq-card w-full max-w-[380px] p-[30px_30px_28px]">
        <div className="flex items-center gap-[9px]">
          <span className="bq-brand-mark" />
          <span className="bq-brand-name">Bloqbase</span>
        </div>
        <div className="mt-[18px] font-display text-[22px] font-bold tracking-[-0.02em]">
          Panel ejecutivo
        </div>
        <div className="mt-[26px]">
          <div className="flex items-baseline gap-[9px]">
            <span className="font-mono-face text-[10px] font-bold text-[color:var(--naranja)]">01</span>
            <label className="bq-label-mono">Email</label>
          </div>
          <input
            name="email"
            type="email"
            required
            defaultValue="admin@bloqbase.net"
            className="mt-[8px] w-full border-b border-[color:var(--borde-input)] bg-transparent py-[10px] text-[15.5px] outline-none focus:border-[color:var(--naranja)]"
          />
        </div>
        <div className="mt-[22px]">
          <div className="flex items-baseline gap-[9px]">
            <span className="font-mono-face text-[10px] font-bold text-[color:var(--naranja)]">02</span>
            <label className="bq-label-mono">Contraseña</label>
          </div>
          <input
            name="password"
            type="password"
            required
            defaultValue="admin123"
            className="mt-[8px] w-full border-b border-[color:var(--borde-input)] bg-transparent py-[10px] text-[15.5px] outline-none focus:border-[color:var(--naranja)]"
          />
        </div>
        <button
          type="submit"
          className="mt-[28px] w-full rounded-[10px] bg-[color:var(--naranja)] px-[22px] py-[14px] font-mono-face text-[11.5px] font-bold uppercase tracking-[0.16em] text-white hover:bg-[color:var(--naranja-hover)]"
        >
          Entrar
        </button>
      </form>
    </div>
  );
}
