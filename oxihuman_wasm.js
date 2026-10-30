/* @ts-self-types="./oxihuman_wasm.d.ts" */
import * as wasm from "./oxihuman_wasm_bg.wasm";
import { __wbg_set_wasm } from "./oxihuman_wasm_bg.js";

__wbg_set_wasm(wasm);
wasm.__wbindgen_start();
export {
    OxiHumanAnimPlayer, OxiHumanEngine, OxiHumanMeasurements, OxiHumanMorphSlider, generateCacheManifestJson, generateSwJs, get_version, set_panic_hook
} from "./oxihuman_wasm_bg.js";
