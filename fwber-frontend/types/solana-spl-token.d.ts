/**
 * Ambient declaration for `@solana/spl-token` (v2.3.41).
 *
 * WHY: the installed package ships ESM JavaScript without bundled type
 * declarations (TS7016 "Could not find a declaration file"), which the
 * Next 16 / TS toolchain now surfaces. The wallet components
 * (WalletDashboard, SendTokenModal) use a handful of its exports at runtime
 * and have always worked against its untyped surface — this shim preserves
 * that exact behavior instead of blocking the build.
 *
 * If the package publishes proper types in a future version, delete this file.
 */
declare module '@solana/spl-token';
