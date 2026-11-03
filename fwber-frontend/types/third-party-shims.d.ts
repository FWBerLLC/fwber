// Third-party type shims (v2.3.54) — packages without bundled types.
// WHY: @dnd-kit/* and laravel-echo ship no .d.ts and have no @types packages;
// without these, tsc reports TS7016. Kept minimal on purpose: prefer real
// upstream types if they ever appear (delete the corresponding block then).
declare module '@dnd-kit/core';
declare module '@dnd-kit/sortable';
declare module '@dnd-kit/utilities';
declare module 'laravel-echo' {
  const Echo: any;
  export default Echo;
}
declare module '@solana/wallet-adapter-phantom';
declare module '@solana/wallet-adapter-solflare';
