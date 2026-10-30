/**
 * Animation recording and playback controller.
 *
 * Obtain one from [`OxiHumanEngine::make_anim_player`].
 *
 * The player stores a raw pointer to its parent engine and delegates all
 * calls back to it.  The engine must not be dropped while the player is
 * alive.  In a browser WASM context both live on the JS heap, so GC
 * ordering is safe as long as the engine reference is kept alive.
 *
 * # Example (JavaScript)
 * ```js
 * const player = engine.make_anim_player();
 * engine.set_param("height", 0.2); player.record_frame();
 * engine.set_param("height", 0.8); player.record_frame();
 * player.set_fps(30);
 * console.log(player.frame_count()); // 2
 * const json = player.export_anim_json();
 * player.clear();
 * ```
 */
export class OxiHumanAnimPlayer {
    static __wrap(ptr) {
        const obj = Object.create(OxiHumanAnimPlayer.prototype);
        obj.__wbg_ptr = ptr;
        OxiHumanAnimPlayerFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        OxiHumanAnimPlayerFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_oxihumananimplayer_free(ptr, 0);
    }
    /**
     * Clear all recorded keyframes and reset the playhead.
     */
    clear() {
        wasm.oxihumananimplayer_clear(this.__wbg_ptr);
    }
    /**
     * Serialize all keyframes to a JSON array.
     *
     * Each element is an object of `{param_name: value, ...}`.
     * @returns {string}
     */
    export_anim_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumananimplayer_export_anim_json(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Return the number of recorded keyframes.
     * @returns {number}
     */
    frame_count() {
        const ret = wasm.oxihumananimplayer_frame_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Return the current playback FPS.
     * @returns {number}
     */
    get_fps() {
        const ret = wasm.oxihumananimplayer_get_fps(this.__wbg_ptr);
        return ret;
    }
    /**
     * Snapshot the engine's current params as an animation keyframe.
     */
    record_frame() {
        wasm.oxihumananimplayer_record_frame(this.__wbg_ptr);
    }
    /**
     * Seek the engine to the given frame index.
     *
     * Out-of-range indices are silently ignored.
     * @param {number} frame
     */
    seek(frame) {
        wasm.oxihumananimplayer_seek(this.__wbg_ptr, frame);
    }
    /**
     * Set animation playback speed in frames per second.
     * @param {number} fps
     */
    set_fps(fps) {
        wasm.oxihumananimplayer_set_fps(this.__wbg_ptr, fps);
    }
    /**
     * Advance playback by `dt_seconds`.
     *
     * Returns the new frame index.
     * @param {number} dt_seconds
     * @returns {number}
     */
    step(dt_seconds) {
        const ret = wasm.oxihumananimplayer_step(this.__wbg_ptr, dt_seconds);
        return ret >>> 0;
    }
}
if (Symbol.dispose) OxiHumanAnimPlayer.prototype[Symbol.dispose] = OxiHumanAnimPlayer.prototype.free;

/**
 * The primary OxiHuman engine exposed to JavaScript.
 *
 * Wraps [`WasmEngine`] and exposes morphing, mesh export, animation and
 * measurement APIs through wasm-bindgen.
 *
 * # Usage
 * ```js
 * const engine = new OxiHumanEngine();
 * engine.set_param("height", 0.8);
 * const bytes = engine.build_mesh_bytes();
 * ```
 */
export class OxiHumanEngine {
    static __wrap(ptr) {
        const obj = Object.create(OxiHumanEngine.prototype);
        obj.__wbg_ptr = ptr;
        OxiHumanEngineFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        OxiHumanEngineFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_oxihumanengine_free(ptr, 0);
    }
    /**
     * Return the number of recorded animation keyframes.
     * @returns {number}
     */
    anim_frame_count() {
        const ret = wasm.oxihumanengine_anim_frame_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Blend two expression presets by weight `t` (0 = a, 1 = b).
     *
     * Returns `true` if both preset names are recognised.
     * @param {string} expr_a
     * @param {string} expr_b
     * @param {number} t
     * @returns {boolean}
     */
    apply_expression_blend(expr_a, expr_b, t) {
        const ptr0 = passStringToWasm0(expr_a, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(expr_b, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.oxihumanengine_apply_expression_blend(this.__wbg_ptr, ptr0, len0, ptr1, len1, t);
        return ret !== 0;
    }
    /**
     * Apply a named body preset (e.g. `"athletic"`, `"average"`, `"slender"`).
     *
     * Returns `true` if the preset was recognised and applied.
     * @param {string} name
     * @returns {boolean}
     */
    apply_preset(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.oxihumanengine_apply_preset(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Build the morphed mesh and return it as raw binary bytes.
     *
     * Binary format — see [`crate::BUFFER_FORMAT_VERSION`] and `MeshBytes`:
     * - Bytes 0–3:   `version` (u32 LE, currently `1`)
     * - Bytes 4–7:   `vertex_count` N (u32 LE)
     * - Bytes 8–11:  `index_count`  M (u32 LE)
     * - Bytes 12..:  positions  f32\[N\*3\]
     * - Then:        normals    f32\[N\*3\]
     * - Then:        uvs        f32\[N\*2\]
     * - Then:        indices    u32\[M\]
     * @returns {Uint8Array}
     */
    build_mesh_bytes() {
        const ret = wasm.oxihumanengine_build_mesh_bytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Clear all recorded animation keyframes.
     */
    clear_anim_frames() {
        wasm.oxihumanengine_clear_anim_frames(this.__wbg_ptr);
    }
    /**
     * Create a particle emitter with the given emit rate and particle lifetime.
     * @param {number} emit_rate
     * @param {number} lifetime
     * @returns {boolean}
     */
    create_particle_system(emit_rate, lifetime) {
        const ret = wasm.oxihumanengine_create_particle_system(this.__wbg_ptr, emit_rate, lifetime);
        return ret !== 0;
    }
    /**
     * Export all animation keyframes as a JSON array.
     * @returns {string}
     */
    export_anim_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_export_anim_json(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Export the current morphed mesh as a binary GLB (glTF 2.0) byte buffer.
     *
     * The returned bytes can be passed directly to `URL.createObjectURL`
     * or written to a `.glb` file.
     *
     * Throws a JavaScript `Error` if GLB serialization fails.
     * @returns {Uint8Array}
     */
    export_glb() {
        const ret = wasm.oxihumanengine_export_glb(this.__wbg_ptr);
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Export the current morphed mesh as a Wavefront OBJ string.
     * @returns {string}
     */
    export_obj() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_export_obj(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Export current params as a JSON string.
     * @returns {string}
     */
    export_params_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_export_params_json(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Return quantized mesh bytes (QMSH format).
     * @returns {Uint8Array}
     */
    export_quantized_bytes() {
        const ret = wasm.oxihumanengine_export_quantized_bytes(this.__wbg_ptr);
        var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
        return v1;
    }
    /**
     * Create an engine pre-loaded with the given OBJ file bytes.
     *
     * `bytes` must be valid UTF-8 OBJ data.
     *
     * Throws a JavaScript `Error` if parsing fails.
     * @param {Uint8Array} bytes
     * @returns {OxiHumanEngine}
     */
    static from_obj_bytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.oxihumanengine_from_obj_bytes(ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return OxiHumanEngine.__wrap(ret[0]);
    }
    /**
     * Return the current animation playback speed in FPS.
     * @returns {number}
     */
    get_anim_fps() {
        const ret = wasm.oxihumanengine_get_anim_fps(this.__wbg_ptr);
        return ret;
    }
    /**
     * Return body proportion ratios as a JSON object.
     * @returns {string}
     */
    get_body_proportions_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_get_body_proportions_json(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Return capsule chains as a JSON string.
     * @returns {string}
     */
    get_capsule_chains_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_get_capsule_chains_json(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Return current cloth simulation state as JSON.
     * @returns {string}
     */
    get_cloth_state() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_get_cloth_state(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Return per-vertex curvature as a JSON array of floats.
     * @returns {string}
     */
    get_curvature_map() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_get_curvature_map(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Return geodesic distances from `source_vertex` as a JSON array.
     * @param {number} source_vertex
     * @returns {string}
     */
    get_geodesic_distances(source_vertex) {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_get_geodesic_distances(this.__wbg_ptr, source_vertex);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Return a JSON array of the names of all JSON-loaded morph targets.
     * @returns {string}
     */
    get_loaded_target_names() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_get_loaded_target_names(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Return an LOD-reduced scene JSON.
     *
     * `lod_level`: `0` = full, `1` = half, `2` = quarter.
     * @param {number} lod_level
     * @returns {string}
     */
    get_lod_scene_json(lod_level) {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_get_lod_scene_json(this.__wbg_ptr, lod_level);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Return measurements for the current morphed body.
     *
     * Returns an [`OxiHumanMeasurements`] object.
     * @returns {OxiHumanMeasurements}
     */
    get_measurements() {
        const ret = wasm.oxihumanengine_get_measurements(this.__wbg_ptr);
        return OxiHumanMeasurements.__wrap(ret);
    }
    /**
     * Return measurements as a JSON string.
     * @returns {string}
     */
    get_measurements_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_get_measurements_json(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Return mesh connectivity segments as a JSON object.
     *
     * `mode`: `"connected"` or `"normals"`.
     * @param {string} mode
     * @returns {string}
     */
    get_mesh_segments(mode) {
        let deferred2_0;
        let deferred2_1;
        try {
            const ptr0 = passStringToWasm0(mode, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.oxihumanengine_get_mesh_segments(this.__wbg_ptr, ptr0, len0);
            deferred2_0 = ret[0];
            deferred2_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
        }
    }
    /**
     * Get a named morphing parameter value.
     *
     * Returns `NaN` if the parameter name is not recognised.
     * @param {string} name
     * @returns {number}
     */
    get_param(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.oxihumanengine_get_param(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * Return a compact JSON summary of current params.
     * @returns {string}
     */
    get_param_summary_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_get_param_summary_json(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Return physics collision proxies as a JSON string.
     * @returns {string}
     */
    get_physics_proxies_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_get_physics_proxies_json(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Return physics proxy data as JSON.
     * @returns {string}
     */
    get_physics_proxy_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_get_physics_proxy_json(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Return physics rig as a JSON string.
     * @returns {string}
     */
    get_physics_rig_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_get_physics_rig_json(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Return the full scene as a JSON string (params + rig + vertex count).
     * @returns {string}
     */
    get_scene_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_get_scene_json(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Get the blend weight of a JSON-loaded morph target.
     *
     * Returns `-1.0` if the target is not found.
     * @param {string} name
     * @returns {number}
     */
    get_target_weight(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.oxihumanengine_get_target_weight(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * Import params from a JSON string previously produced by
     * `export_params_json`.
     *
     * Throws a JavaScript `Error` if the JSON is malformed.
     * @param {string} json
     */
    import_params_json(json) {
        const ptr0 = passStringToWasm0(json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.oxihumanengine_import_params_json(this.__wbg_ptr, ptr0, len0);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Initialise a cloth simulation from the most recently built mesh.
     *
     * Does nothing when no mesh has been built yet.
     * `stiffness` is forwarded to all cloth springs; 0.0 = limp, 1.0 = rigid.
     * @param {number} stiffness
     */
    init_cloth(stiffness) {
        wasm.oxihumanengine_init_cloth(this.__wbg_ptr, stiffness);
    }
    /**
     * Return a list of built-in shader names as a JSON array.
     * @returns {string}
     */
    list_builtin_shaders() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_list_builtin_shaders(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Return a JSON array of the names of all engine-loaded morph targets.
     * @returns {string}
     */
    list_loaded_targets() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_list_loaded_targets(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Load a morph target from raw `.target` file bytes.
     *
     * `name` is used to infer the morph category and auto-assign a weight
     * function.  Throws a JavaScript `Error` if parsing fails.
     * @param {string} name
     * @param {Uint8Array} bytes
     */
    load_target_bytes(name, bytes) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.oxihumanengine_load_target_bytes(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        if (ret[1]) {
            throw takeFromExternrefTable0(ret[0]);
        }
    }
    /**
     * Load a morph target from a JSON descriptor.
     *
     * Expected format: `{"deltas":[[vid,dx,dy,dz],...]}`
     *
     * Returns `true` on success, `false` on parse error.
     * @param {string} name
     * @param {string} json
     * @returns {boolean}
     */
    load_target_from_json(name, json) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.oxihumanengine_load_target_from_json(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        return ret !== 0;
    }
    /**
     * Load a ZIP asset pack from raw bytes.
     *
     * The ZIP must contain one `.obj` file (base mesh) and any number of
     * `.target` files (morph targets).
     *
     * Returns the number of morph targets loaded.
     * Throws a JavaScript `Error` if the ZIP is malformed or contains no `.obj`.
     * @param {Uint8Array} bytes
     * @returns {number}
     */
    load_zip_pack_bytes(bytes) {
        const ptr0 = passArray8ToWasm0(bytes, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.oxihumanengine_load_zip_pack_bytes(this.__wbg_ptr, ptr0, len0);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        return ret[0] >>> 0;
    }
    /**
     * Return the number of JSON-loaded morph targets.
     * @returns {number}
     */
    loaded_target_count() {
        const ret = wasm.oxihumanengine_loaded_target_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Create an [`OxiHumanAnimPlayer`] wrapping this engine's animation state.
     *
     * The player delegates all calls back to `self`, providing a
     * semantically grouped animation sub-API.
     *
     * # Safety / ownership
     * The player stores a raw pointer to `self`.  It must not outlive
     * this engine.  Both live on the JS heap in WASM (single-threaded),
     * so lifetime issues cannot arise in practice.
     * @returns {OxiHumanAnimPlayer}
     */
    make_anim_player() {
        const ret = wasm.oxihumanengine_make_anim_player(this.__wbg_ptr);
        return OxiHumanAnimPlayer.__wrap(ret);
    }
    /**
     * Create a new engine with a minimal stub mesh.
     *
     * The stub mesh has 3 vertices (one degenerate triangle).  Call
     * `from_obj_bytes` or `load_zip_pack_bytes` to replace it with a real
     * base mesh.
     */
    constructor() {
        const ret = wasm.oxihumanengine_new();
        this.__wbg_ptr = ret;
        OxiHumanEngineFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Advance animation by `dt_seconds` and return the new frame index.
     * @param {number} dt_seconds
     * @returns {number}
     */
    play_anim_step(dt_seconds) {
        const ret = wasm.oxihumanengine_play_anim_step(this.__wbg_ptr, dt_seconds);
        return ret >>> 0;
    }
    /**
     * Return vertex indices within `radius` of the given point as a JSON array.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @param {number} radius
     * @returns {string}
     */
    query_sphere_near_point(x, y, z, radius) {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_query_sphere_near_point(this.__wbg_ptr, x, y, z, radius);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Snapshot the current params as an animation keyframe.
     */
    record_anim_frame() {
        wasm.oxihumanengine_record_anim_frame(this.__wbg_ptr);
    }
    /**
     * Reset all parameters to their default mid-point values and
     * invalidate the mesh cache.
     */
    reset_params() {
        wasm.oxihumanengine_reset_params(this.__wbg_ptr);
    }
    /**
     * Seek to a specific animation frame, restoring its params snapshot.
     * @param {number} frame
     */
    seek_anim_frame(frame) {
        wasm.oxihumanengine_seek_anim_frame(this.__wbg_ptr, frame);
    }
    /**
     * Set animation playback speed in frames per second.
     * @param {number} fps
     */
    set_anim_fps(fps) {
        wasm.oxihumanengine_set_anim_fps(this.__wbg_ptr, fps);
    }
    /**
     * Set a named morphing parameter.
     *
     * Well-known names: `"height"`, `"weight"`, `"muscle"`, `"age"`.
     * Any other name is stored as an extra parameter and may drive a
     * matching morph target by name.
     *
     * Values are typically in `[0.0, 1.0]`.
     * @param {string} name
     * @param {number} value
     */
    set_param(name, value) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.oxihumanengine_set_param(this.__wbg_ptr, ptr0, len0, value);
    }
    /**
     * Set the blend weight for a JSON-loaded morph target.
     *
     * Returns `true` if the target was found.
     * @param {string} name
     * @param {number} weight
     * @returns {boolean}
     */
    set_target_weight(name, weight) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.oxihumanengine_set_target_weight(this.__wbg_ptr, ptr0, len0, weight);
        return ret !== 0;
    }
    /**
     * Set the wind vector for physics simulation.
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    set_wind(x, y, z) {
        wasm.oxihumanengine_set_wind(this.__wbg_ptr, x, y, z);
    }
    /**
     * Advance the particle simulation by `dt` seconds.
     *
     * Returns JSON: `{"active": N, "positions": [[x,y,z], ...]}`.
     * @param {number} dt
     * @returns {string}
     */
    step_particles(dt) {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanengine_step_particles(this.__wbg_ptr, dt);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Step physics simulation by `dt` seconds.
     * @param {number} dt
     */
    step_physics(dt) {
        wasm.oxihumanengine_step_physics(this.__wbg_ptr, dt);
    }
    /**
     * Return the number of engine-loaded morph targets.
     * @returns {number}
     */
    target_count() {
        const ret = wasm.oxihumanengine_target_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Unload a previously JSON-loaded target by name.
     *
     * Returns `true` if the target existed.
     * @param {string} name
     * @returns {boolean}
     */
    unload_target(name) {
        const ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.oxihumanengine_unload_target(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * Number of vertices in the base mesh.
     * @returns {number}
     */
    vertex_count() {
        const ret = wasm.oxihumanengine_vertex_count(this.__wbg_ptr);
        return ret >>> 0;
    }
}
if (Symbol.dispose) OxiHumanEngine.prototype[Symbol.dispose] = OxiHumanEngine.prototype.free;

/**
 * Body measurements derived from the morphed mesh.
 *
 * All linear measurements are in centimetres; `weight_kg` is kilograms.
 *
 * Obtained via [`OxiHumanEngine::get_measurements`].
 */
export class OxiHumanMeasurements {
    static __wrap(ptr) {
        const obj = Object.create(OxiHumanMeasurements.prototype);
        obj.__wbg_ptr = ptr;
        OxiHumanMeasurementsFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        OxiHumanMeasurementsFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_oxihumanmeasurements_free(ptr, 0);
    }
    /**
     * Chest circumference estimate in centimetres.
     * @returns {number}
     */
    chest_cm() {
        const ret = wasm.oxihumanmeasurements_chest_cm(this.__wbg_ptr);
        return ret;
    }
    /**
     * Standing height in centimetres.
     * @returns {number}
     */
    height_cm() {
        const ret = wasm.oxihumanmeasurements_height_cm(this.__wbg_ptr);
        return ret;
    }
    /**
     * Hip circumference estimate in centimetres.
     * @returns {number}
     */
    hip_cm() {
        const ret = wasm.oxihumanmeasurements_hip_cm(this.__wbg_ptr);
        return ret;
    }
    /**
     * Waist circumference estimate in centimetres.
     * @returns {number}
     */
    waist_cm() {
        const ret = wasm.oxihumanmeasurements_waist_cm(this.__wbg_ptr);
        return ret;
    }
    /**
     * Estimated body mass in kilograms (BMI-21 heuristic).
     * @returns {number}
     */
    weight_kg() {
        const ret = wasm.oxihumanmeasurements_weight_kg(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) OxiHumanMeasurements.prototype[Symbol.dispose] = OxiHumanMeasurements.prototype.free;

/**
 * A morph slider binding for use in slider-based UIs.
 *
 * Obtain a slider from a param name via
 * [`OxiHumanMorphSlider::for_param`].
 *
 * # Example (JavaScript)
 * ```js
 * const slider = OxiHumanMorphSlider.for_param(engine, "height");
 * console.log(slider.name(), slider.min(), slider.max(), slider.value());
 * slider.set_value(0.8);
 * ```
 */
export class OxiHumanMorphSlider {
    static __wrap(ptr) {
        const obj = Object.create(OxiHumanMorphSlider.prototype);
        obj.__wbg_ptr = ptr;
        OxiHumanMorphSliderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        OxiHumanMorphSliderFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_oxihumanmorphslider_free(ptr, 0);
    }
    /**
     * Create a slider bound to `param_name` on `engine`.
     *
     * Well-known params (`height`, `weight`, `muscle`, `age`) have min=0,
     * max=1.  Unknown extra params default to min=0, max=1.
     * @param {OxiHumanEngine} engine
     * @param {string} param_name
     * @returns {OxiHumanMorphSlider}
     */
    static for_param(engine, param_name) {
        _assertClass(engine, OxiHumanEngine);
        const ptr0 = passStringToWasm0(param_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.oxihumanmorphslider_for_param(engine.__wbg_ptr, ptr0, len0);
        return OxiHumanMorphSlider.__wrap(ret);
    }
    /**
     * Return the maximum allowed value (always `1.0` for standard params).
     * @returns {number}
     */
    max() {
        const ret = wasm.oxihumanmorphslider_max(this.__wbg_ptr);
        return ret;
    }
    /**
     * Return the minimum allowed value (always `0.0` for standard params).
     * @returns {number}
     */
    min() {
        const ret = wasm.oxihumanmorphslider_min(this.__wbg_ptr);
        return ret;
    }
    /**
     * Return the parameter name this slider is bound to.
     * @returns {string}
     */
    name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.oxihumanmorphslider_name(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Set a new slider value and propagate it to the engine.
     *
     * Values outside `[min, max]` are clamped.
     * @param {number} v
     */
    set_value(v) {
        wasm.oxihumanmorphslider_set_value(this.__wbg_ptr, v);
    }
    /**
     * Return the current slider value.
     * @returns {number}
     */
    value() {
        const ret = wasm.oxihumanmorphslider_value(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) OxiHumanMorphSlider.prototype[Symbol.dispose] = OxiHumanMorphSlider.prototype.free;

/**
 * Generate a cache-manifest JSON string.
 *
 * `config_json` must match `OxiHumanSwConfig`; `entries_json` must be a
 * JSON array of `OxiHumanCacheEntry` objects.
 *
 * Throws a JavaScript `Error` if either argument is malformed.
 * @param {string} config_json
 * @param {string} entries_json
 * @returns {string}
 */
export function generateCacheManifestJson(config_json, entries_json) {
    let deferred4_0;
    let deferred4_1;
    try {
        const ptr0 = passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(entries_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.generateCacheManifestJson(ptr0, len0, ptr1, len1);
        var ptr3 = ret[0];
        var len3 = ret[1];
        if (ret[3]) {
            ptr3 = 0; len3 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred4_0 = ptr3;
        deferred4_1 = len3;
        return getStringFromWasm0(ptr3, len3);
    } finally {
        wasm.__wbindgen_free(deferred4_0, deferred4_1, 1);
    }
}

/**
 * Generate service-worker JavaScript from a JSON configuration object.
 *
 * `config_json` must be a JSON string matching the `OxiHumanSwConfig`
 * TypeScript interface defined in this module.
 *
 * Returns the service-worker JavaScript as a string, ready to be written
 * to `service-worker.js` in your web root.
 *
 * Throws a JavaScript `Error` if `config_json` is malformed.
 * @param {string} config_json
 * @returns {string}
 */
export function generateSwJs(config_json) {
    let deferred3_0;
    let deferred3_1;
    try {
        const ptr0 = passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.generateSwJs(ptr0, len0);
        var ptr2 = ret[0];
        var len2 = ret[1];
        if (ret[3]) {
            ptr2 = 0; len2 = 0;
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred3_0 = ptr2;
        deferred3_1 = len2;
        return getStringFromWasm0(ptr2, len2);
    } finally {
        wasm.__wbindgen_free(deferred3_0, deferred3_1, 1);
    }
}

/**
 * Return the crate version string (e.g. `"0.1.0"`).
 * @returns {string}
 */
export function get_version() {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_version();
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Install `console.error` as the Rust panic hook.
 *
 * Call this once at startup before any other API call so that Rust panics
 * appear in the browser developer console rather than as cryptic
 * `unreachable` WebAssembly traps.
 */
export function set_panic_hook() {
    wasm.set_panic_hook();
}
export function __wbg_Error_fdd633d4bb5dd76a(arg0, arg1) {
    const ret = Error(getStringFromWasm0(arg0, arg1));
    return ret;
}
export function __wbg___wbindgen_throw_ea4887a5f8f9a9db(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
}
export function __wbg_error_a6fa202b58aa1cd3(arg0, arg1) {
    let deferred0_0;
    let deferred0_1;
    try {
        deferred0_0 = arg0;
        deferred0_1 = arg1;
        console.error(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
    }
}
export function __wbg_new_227d7c05414eb861() {
    const ret = new Error();
    return ret;
}
export function __wbg_stack_3b0d974bbf31e44f(arg0, arg1) {
    const ret = arg1.stack;
    const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
    getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
}
export function __wbindgen_init_externref_table() {
    const table = wasm.__wbindgen_externrefs;
    const offset = table.grow(4);
    table.set(0, undefined);
    table.set(offset + 0, undefined);
    table.set(offset + 1, null);
    table.set(offset + 2, true);
    table.set(offset + 3, false);
}
const OxiHumanAnimPlayerFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_oxihumananimplayer_free(ptr, 1));
const OxiHumanEngineFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_oxihumanengine_free(ptr, 1));
const OxiHumanMeasurementsFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_oxihumanmeasurements_free(ptr, 1));
const OxiHumanMorphSliderFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_oxihumanmorphslider_free(ptr, 1));

function _assertClass(instance, klass) {
    if (!(instance instanceof klass)) {
        throw new Error(`expected instance of ${klass.name}`);
    }
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;


let wasm;
export function __wbg_set_wasm(val) {
    wasm = val;
}
