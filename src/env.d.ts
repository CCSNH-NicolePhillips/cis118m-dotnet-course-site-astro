/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
	readonly PUBLIC_RUN_MODE?: "stub" | "proxy";
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}