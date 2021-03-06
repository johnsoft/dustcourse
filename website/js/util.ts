import { Rectangle } from './coords';
import * as model from './model';
import { Frame, FrameContainer } from './gfx';

export function lerp(x1: number, x2: number, p: number) {
    return x1 + (x2 - x1) * p;
}

export function lerpRGB(rgb1: number, rgb2: number, p: number) {
    var r1 = (rgb1 & 0xff0000) >> 16;
    var g1 = (rgb1 & 0xff00) >> 8;
    var b1 = rgb1 & 0xff;
    var r2 = (rgb2 & 0xff0000) >> 16;
    var g2 = (rgb2 & 0xff00) >> 8;
    var b2 = rgb2 & 0xff;
    var r = r1 + (r2 - r1) * p;
    var g = g1 + (g2 - g1) * p;
    var b = b1 + (b2 - b1) * p;
    return (r << 16) + (g << 8) + (b | 0);
}

// http://stackoverflow.com/questions/17242144/javascript-convert-hsb-hsv-color-to-rgb-accurately
export function hsvToRgb(h: number, s: number, v: number) {
    var r: number, g: number, b: number, i: number, f: number, p: number, q: number, t: number;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return [r, g, b];
}

export function distance(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
}

export function moveArrayElement<T>(array: T[], element: T, newIndex: number) {
    if (array[newIndex] === element)
        return;
    var oldIndex = _.indexOf(array, element);
    if (oldIndex !== -1)
        array.splice(oldIndex, 1);
    array.splice(newIndex - <any>(newIndex > oldIndex), 0, element);
}

export function convertIntToRGB(color: number) {
    var r = (color & 0xff0000) >> 16;
    var g = (color & 0xff00) >> 8;
    var b = color & 0xff;
    return [r / 255, g / 255, b / 255];
}

export function convertIntToCSSRGB(color: number) {
    var r = (color & 0xff0000) >> 16;
    var g = (color & 0xff00) >> 8;
    var b = color & 0xff;
    return 'rgb(' + r + ',' + g + ',' + b + ')';
}

export class FrameCounter {
    private counter = 0;
    private lastFrameTime: number;

    public frame() {
        return Math.floor(this.counter);
    }

    public setFrame(f: number) {
        this.counter = f;
        this.lastFrameTime = null;
    }

    public advance() {
        var time = window.performance && performance.now ? performance.now() : Date.now();
        if (!this.lastFrameTime) {
            this.lastFrameTime = time;
            return this.counter;
        }

        var framesElapsed = (time - this.lastFrameTime) / 1000 * 60;
        if (framesElapsed > 0 && framesElapsed < 300)
            this.counter += framesElapsed;
        else
            this.counter += 1;
        this.lastFrameTime = time;
        return this.counter;
    }
}

export function addDustforceSprite(stage: PIXI.Container, fc: FrameContainer, options?: DustforceSpriteOptions) {
    var s = new DustforceSprite(fc);
    s.position.x = options ? (options.posX || 0) : 0;
    s.position.y = options ? (options.posY || 0) : 0;
    s.scale.x = options ? (options.scaleX || options.scale || 1) : 1;
    s.scale.y = options ? (options.scaleY || options.scale || 1) : 1;
    s.rotation = options ? (options.rotation || 0) : 0;
    s.alpha = options ? (options.alpha || 1) : 1;
    stage.addChild(s);
    return s;
}

export function createDustforceSprite(fc: FrameContainer, x: number, y: number, options?: DustforceSpriteOptions) {
    var s = new DustforceSprite(fc);
    s.position.x = x;
    s.position.y = y;
    s.scale.x = options ? (options.scaleX || options.scale || 1) : 1;
    s.scale.y = options ? (options.scaleY || options.scale || 1) : 1;
    s.rotation = options ? (options.rotation || 0) : 0;
    s.alpha = options ? (options.alpha || 1) : 1;
    return s;
}

export function transparentSprite(x: number, y: number, width: number, height: number) {
    var g = new PIXI.Graphics();
    g.alpha = 0;
    g.beginFill(0);
    g.drawRect(x, y, width, height);
    g.endFill();
    return g;
}

interface DustforceSpriteOptions {
    posX?: number;
    posY?: number;
    scale?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    alpha?: number;
}

// These classes exist because I needed finer control over the transformation matrix than pixi.js provides
// updateTransform isn't actually documented, but it seems like a logical enough solution

export class ChunkContainer extends PIXI.Container {
    public updateTransform() {
        this.worldTransform.identity()
            .translate(this.position.x, this.position.y)
            .scale(this.scale.x, this.scale.y)
            .prepend(this.parent.worldTransform);

        // copied from PIXI.DisplayObject.updateTransform
        this.worldAlpha = this.alpha * this.parent.worldAlpha;
        this._currentBounds = null;

        for (var ci = 0, cl = this.children.length; ci < cl; ++ci)
            this.children[ci].updateTransform();
    }
}

export class ViewportParticleContainer extends PIXI.ParticleContainer {
    public updateTransform() {
        this.worldTransform.identity()
            .translate(this.position.x, this.position.y)
            .scale(this.scale.x, this.scale.y)
            .prepend(this.parent.worldTransform);

        // copied from PIXI.DisplayObject.updateTransform
        this.worldAlpha = this.alpha * this.parent.worldAlpha;
        this._currentBounds = null;

        for (var ci = 0, cl = this.children.length; ci < cl; ++ci)
            this.children[ci].updateTransform();
    }
}

export class DustforceSprite extends PIXI.Sprite {
    constructor(private fc?: FrameContainer) {
        super(fc && fc.frame && fc.frame.texture);
    }

    public setFrame(fc: FrameContainer) {
        this.fc = fc;
        var texture = fc && fc.frame && fc.frame.texture || PIXI.Texture.EMPTY;
        if (this.texture !== texture)
            this.texture = texture;
    }

    public updateTransform() {
        this.setFrame(this.fc);

        var hitbox = this.fc && this.fc.frame && this.fc.frame.hitbox;

        this.worldTransform.identity()
            .translate(hitbox ? hitbox.left : 0, hitbox ? hitbox.top : 0)
            .scale(this.scale.x, this.scale.y)
            .rotate(this.rotation)
            .translate(this.position.x, this.position.y)
            .prepend(this.parent.worldTransform);

        // copied from PIXI.DisplayObject.updateTransform
        this.worldAlpha = this.alpha * this.parent.worldAlpha;
        this._currentBounds = null;

        for (var ci = 0, cl = this.children.length; ci < cl; ++ci)
            this.children[ci].updateTransform();
    }
}

export function applyFog(obj: PIXI.DisplayObject, level: model.Level, layerNum: number) {
    if (!level.currentFog)
        return;

    var filter = level.currentFogFilters[layerNum];
    if (!filter)
        filter = level.currentFogFilters[layerNum] = [new PIXI.filters.ColorMatrixFilter()];
    // as you can see, this function doesn't play nice with other filters on the passed object. oh well.
    if (!obj.filters)
        obj.filters = filter;

    var [r, g, b] = convertIntToRGB(level.currentFog['fog_colour'][layerNum]);
    var p = level.currentFog['fog_per'][layerNum];
    var jaundice = layerNum === 0 ? 7 / 8 : 1;  // see the stars section in README

    tintMatrix(filter[0].matrix, r, g, b, p, jaundice);
}

// oh god the code duplication
export function updateFogFilter(level: model.Level, layerNum: number) {
    if (!level.currentFog)
        return;

    var filter = level.currentFogFilters[layerNum];
    if (!filter)
        filter = level.currentFogFilters[layerNum] = [new PIXI.filters.ColorMatrixFilter()];

    var [r, g, b] = convertIntToRGB(level.currentFog['fog_colour'][layerNum]);
    var p = level.currentFog['fog_per'][layerNum];
    var jaundice = layerNum === 0 ? 7 / 8 : 1;  // see the stars section in README

    tintMatrix(filter[0].matrix, r, g, b, p, jaundice);
    return filter[0];
}

// This assumes nobody else ever touches the matrix.
export function tintMatrix(matrix: number[], r: number, g: number, b: number, p: number, jaundice: number) {
    // [ 1 - p, 0,     0,     r * p, 0,
    //   0,     1 - p, 0,     g * p, 0,
    //   0,     0,     1 - p, b * p, 0,
    //   0,     0,     0,     1,     0 ]

    matrix[0] = 1 - p;
    matrix[3] = r * p;
    matrix[6] = 1 - p;
    matrix[8] = g * p;
    matrix[12] = (1 - p) * jaundice;
    matrix[13] = b * p * jaundice;
}

// The matrices are the wrong shape to multiply, but we do the best we can.
export function multiplyColorMatrices(out: number[], a: number[], b: number[]) {
    out[0] = a[0] * b[0] + a[1] * b[5] + a[2] * b[10] + a[3] * b[15];
    out[1] = a[0] * b[1] + a[1] * b[6] + a[2] * b[11] + a[3] * b[16];
    out[2] = a[0] * b[2] + a[1] * b[7] + a[2] * b[12] + a[3] * b[17];
    out[3] = a[0] * b[3] + a[1] * b[8] + a[2] * b[13] + a[3] * b[18];
    out[4] = a[0] * b[4] + a[1] * b[9] + a[2] * b[14] + a[3] * b[19];
    out[5] = a[5] * b[0] + a[6] * b[5] + a[7] * b[10] + a[8] * b[15];
    out[6] = a[5] * b[1] + a[6] * b[6] + a[7] * b[11] + a[8] * b[16];
    out[7] = a[5] * b[2] + a[6] * b[7] + a[7] * b[12] + a[8] * b[17];
    out[8] = a[5] * b[3] + a[6] * b[8] + a[7] * b[13] + a[8] * b[18];
    out[9] = a[5] * b[4] + a[6] * b[9] + a[7] * b[14] + a[8] * b[19];
    out[10] = a[10] * b[0] + a[11] * b[5] + a[12] * b[10] + a[13] * b[15];
    out[11] = a[10] * b[1] + a[11] * b[6] + a[12] * b[11] + a[13] * b[16];
    out[12] = a[10] * b[2] + a[11] * b[7] + a[12] * b[12] + a[13] * b[17];
    out[13] = a[10] * b[3] + a[11] * b[8] + a[12] * b[13] + a[13] * b[18];
    out[14] = a[10] * b[4] + a[11] * b[9] + a[12] * b[14] + a[13] * b[19];
    out[15] = a[15] * b[0] + a[16] * b[5] + a[17] * b[10] + a[18] * b[15];
    out[16] = a[15] * b[1] + a[16] * b[6] + a[17] * b[11] + a[18] * b[16];
    out[17] = a[15] * b[2] + a[16] * b[7] + a[17] * b[12] + a[18] * b[17];
    out[18] = a[15] * b[3] + a[16] * b[8] + a[17] * b[13] + a[18] * b[18];
    out[19] = a[15] * b[4] + a[16] * b[9] + a[17] * b[14] + a[18] * b[19];
}
