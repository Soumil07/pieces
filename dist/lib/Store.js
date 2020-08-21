"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Store = void 0;
const collection_1 = require("@discordjs/collection");
const promises_1 = require("fs/promises");
const path_1 = require("path");
const LoaderError_1 = require("./errors/LoaderError");
const LoadJavaScript_1 = require("./strategies/filters/LoadJavaScript");
const LoadSingle_1 = require("./strategies/loaders/LoadSingle");
/**
 * The store class which contains [[Piece]]s.
 */
class Store extends collection_1.default {
    /**
     * @param constructor The piece constructor this store loads.
     * @param options The options for the store.
     */
    constructor(constructor, options = {}) {
        var _a, _b, _c, _d, _e, _f, _g;
        super();
        this.Constructor = constructor;
        this.paths = (_a = options.paths) !== null && _a !== void 0 ? _a : [];
        this.context = options.context;
        this.filterHook = (_b = options.filterHook) !== null && _b !== void 0 ? _b : LoadJavaScript_1.LoadJavaScript.getNameData.bind(LoadJavaScript_1.LoadJavaScript);
        this.preloadHook = (_c = options.preloadHook) !== null && _c !== void 0 ? _c : ((path) => Promise.resolve().then(() => require(path)));
        this.loadHook = (_d = options.loadHook) !== null && _d !== void 0 ? _d : LoadSingle_1.LoadSingle.load.bind(LoadSingle_1.LoadSingle);
        this.onPostLoad = (_e = options.onPostLoad) !== null && _e !== void 0 ? _e : (() => void 0);
        this.onUnload = (_f = options.onUnload) !== null && _f !== void 0 ? _f : (() => void 0);
        this.onError = (_g = options.onError) !== null && _g !== void 0 ? _g : ((error) => console.error(error));
    }
    /**
     * Loads a piece or more from a path.
     * @param path The path of the file to load.
     * @return An async iterator that yields each one of the loaded pieces.
     */
    async *load(path) {
        const data = this.filterHook(path);
        if (data === null)
            return;
        const options = { name: data.name, enabled: true };
        for await (const Ctor of this.loadHook(this, path)) {
            yield this.insert(new Ctor({ context: this.context, store: this, path }, options));
        }
    }
    /**
     * Unloads a piece given its instance or its name.
     * @param name The name of the file to load.
     * @return Returns the piece that was unloaded.
     */
    unload(name) {
        const piece = this.resolve(name);
        this.delete(piece.name);
        this.onUnload(this, piece);
        return piece;
    }
    /**
     * Loads all pieces from all directories specified by [[paths]].
     */
    async loadAll() {
        const pieces = [];
        for (const path of this.paths) {
            for await (const piece of this.loadPath(path)) {
                pieces.push(piece);
            }
        }
        this.clear();
        for (const piece of pieces) {
            this.insert(piece);
        }
    }
    /**
     * Resolves a piece by its name or its instance.
     * @param name The name of the piece or the instance itself.
     * @return The resolved piece.
     */
    resolve(name) {
        if (typeof name === 'string') {
            const result = this.get(name);
            if (typeof result === 'undefined')
                throw new LoaderError_1.LoaderError('UNLOADED_PIECE', `The piece '${name}' does not exist.`);
            return result;
        }
        if (name instanceof this.Constructor)
            return name;
        throw new LoaderError_1.LoaderError('INCORRECT_TYPE', `The piece '${name.name}' is not an instance of '${this.Constructor.name}'.`);
    }
    /**
     * Inserts a piece into the store.
     * @param piece The piece to be inserted into the store.
     * @return The inserted piece.
     */
    insert(piece) {
        if (!piece.enabled)
            return piece;
        this.set(piece.name, piece);
        this.onPostLoad(this, piece);
        return piece;
    }
    /**
     * Loads a directory into the store.
     * @param directory The directory to load the pieces from.
     * @return An async iterator that yields the pieces to be loaded into the store.
     */
    async *loadPath(directory) {
        for await (const child of this.walk(directory)) {
            const path = path_1.join(directory, child.name);
            const data = this.filterHook(path);
            if (data === null)
                continue;
            try {
                for await (const Ctor of this.loadHook(this, path)) {
                    yield new Ctor({ context: this.context, store: this, path }, { name: data.name, enabled: true });
                }
            }
            catch (error) {
                this.onError(error, path);
            }
        }
    }
    /**
     * Retrieves all possible pieces.
     * @param path The directory to load the pieces from.
     * @return An async iterator that yields the modules to be processed and loaded into the store.
     */
    async *walk(path) {
        const dir = await promises_1.opendir(path);
        for await (const item of dir) {
            if (item.isFile())
                yield item;
            else if (item.isDirectory())
                yield* this.walk(path_1.join(dir.path, item.name));
        }
    }
}
exports.Store = Store;
//# sourceMappingURL=Store.js.map