import * as model from './model';
import { Sprite } from './sprites';

export function distance(x1: number, y1: number, x2: number, y2: number) {
    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
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

export function addDustforceSprite(stage: PIXI.Container, sprite: Sprite, options?: DustforceSpriteOptions) {
    var s = new DustforceSprite(sprite);
    s.position.x = options ? (options.posX || 0) : 0;
    s.position.y = options ? (options.posY || 0) : 0;
    s.scale.x = options ? (options.scaleX || options.scale || 1) : 1;
    s.scale.y = options ? (options.scaleY || options.scale || 1) : 1;
    s.rotation = options ? (options.rotation || 0) : 0;
    s.alpha = options ? (options.alpha || 1) : 1;
    stage.addChild(s);
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
    constructor(private sprite: Sprite) {
        super(sprite.texture.texture);
    }

    public updateTransform() {
        this.worldTransform.identity()
            .translate(this.sprite.hitbox.left, this.sprite.hitbox.top)
            .rotate(this.rotation)
            .scale(this.scale.x, this.scale.y)
            .translate(this.position.x, this.position.y)
            .prepend(this.parent.worldTransform);

        // copied from PIXI.DisplayObject.updateTransform
        this.worldAlpha = this.alpha * this.parent.worldAlpha;
        this._currentBounds = null;
    }
}

export function applyFog(obj: PIXI.DisplayObject, level: model.Level, layerNum: number) {
    var fog = level.currentFog;
    if (!fog)
        return;

    // as you can see, this function doesn't play nice with other filters on the passed object. oh well.
    var filter = obj.filters && <PIXI.filters.ColorMatrixFilter>obj.filters[0];
    if (!filter) {
        filter = new PIXI.filters.ColorMatrixFilter();
        obj.filters = [filter];
    }

    var fogProps = model.entityProperties(fog);
    var [r, g, b] = convertIntToRGB(fogProps['fog_colour'][layerNum]);
    var p = fogProps['fog_per'][layerNum];
    filter.matrix = [
        1 - p, 0,     0,     r * p, 0,
        0,     1 - p, 0,     g * p, 0,
        0,     0,     1 - p, b * p, 0,
        0,     0,     0,     1,     0,
    ];
}
