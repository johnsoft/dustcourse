import { Point, Rectangle, Size, Viewport } from './coords';
import * as gfx from './gfx';
import * as levelViewer from './levelViewer';
import DragScroll from './dragscroll';

export class Widget implements DragScroll.Callback {
    private renderer: PIXI.SystemRenderer;
    private container: PIXI.Container;
    public viewport: Viewport;
    public layers: Layer[];
    private scroll: DragScroll;
    public propsLayers: levelViewer.PropsLayer[];

    constructor() {
        var view = <HTMLCanvasElement>document.querySelector('canvas');
        this.renderer = new PIXI.WebGLRenderer(0, 0, { view: view, transparent: true });
        this.container = new PIXI.Container();
        this.layers = [];
        this.viewport = new Viewport(new Point(0, 0), new Size(0, 0), 1);
        this.advanceFrame();

        this.scroll = new DragScroll(this);
        this.scroll.bindEvents(this.getElement());
    }

    public getElement() {
        return this.renderer.view;
    }

    public scrollTo(x: number, y: number, zoom: number) {
        this.viewport = new Viewport(new Point(x, y), this.viewport.size, zoom);
    }

    public getViewport() {
        return this.viewport;
    }

    public setViewport(viewport: Viewport) {
        this.viewport = viewport;
    }

    public addLayer(layer: Layer) {
        this.layers.push(layer);
        this.layers.sort((x, y) => x.def.zindex - y.def.zindex);
        this.container.removeChildren();
        _.each(this.layers, layer => {
            this.container.addChild(layer.stage);
        });
    }

    public advanceFrame() {
        TWEEN.update();

        var screenWidth = this.getElement().clientWidth;
        var screenHeight = this.getElement().clientHeight;
        if (screenWidth !== this.renderer.width || screenHeight !== this.renderer.height) {
            var screenSize = new Size(screenWidth, screenHeight);
            this.viewport = new Viewport(this.viewport.position, screenSize, this.viewport.zoom);
            this.renderer.resize(screenWidth, screenHeight);
        }

        _.each(this.layers, layer => {
            var screenRect = this.viewport.screenRect();
            var worldRect = this.viewport.screenToWorldR(layer, screenRect);
            layer.update(this.viewport, screenRect, worldRect);
        });
        this.renderer.render(this.container);
        requestAnimationFrame(() => { this.advanceFrame(); });
    }
}

export interface Layer {
    def: LayerDef;
    stage: PIXI.Container;

    update(viewport: Viewport, canvasRect: Rectangle, worldRect: Rectangle): void;
}

export interface LayerDef {
    zindex: number;
    parallax: number;
}

export interface TileLayerDef extends LayerDef {
    scales: TileScale[];
    textureScale: number;
    getTile(scale: TileScale, x: number, y: number, firstChoice: boolean): gfx.FrameContainer;
}

export interface TileScale {
    scale: number;
    tileWidth: number;
    tileHeight: number;
}

export class TileLayer implements Layer {
    public stage = new PIXI.Container();

    constructor(public def: TileLayerDef) { }

    public update(viewport: Viewport, canvasRect: Rectangle, worldRect: Rectangle) {
        var scales = _.sortBy(this.def.scales, s => s.scale);
        var scale = chooseTileScale(scales, viewport.zoom);
        var scaleIndex = _.indexOf(scales, scale);
        var otherScales = [scales[scaleIndex + 1], scales[scaleIndex - 1]].filter(s => <any>s);

        this.stage.removeChildren();
        enumerateTiles(this, worldRect, scale, true, otherScales, (tileRect, scale, texture) => {
            this.addTile(viewport, canvasRect, scale, tileRect, texture);
        });
    }

    private addTile(viewport: Viewport, canvasRect: Rectangle, scale: TileScale,
                    tileRect: Rectangle, texture: PIXI.Texture) {
        var screenRect = viewport.worldToScreenR(this, tileRect);
        var sprite = new PIXI.Sprite(texture);
        sprite.position.x = screenRect.left - canvasRect.left;
        sprite.position.y = screenRect.top - canvasRect.top;
        sprite.scale.x = sprite.scale.y = viewport.zoom / scale.scale * this.def.textureScale;
        this.stage.addChild(sprite);
    }
}

function chooseTileScale(scales: TileScale[], targetZoom: number) {
    return _.find(scales, s => s.scale >= targetZoom) || scales[scales.length - 1];
}

function enumerateTiles(layer: TileLayer, area: Rectangle, scale: TileScale, firstChoice: boolean, otherScales: TileScale[], callback: (r: Rectangle, s: TileScale, t: PIXI.Texture) => void) {
    var minX = Math.floor(area.left / scale.tileWidth) * scale.tileWidth;
    var maxX = Math.ceil(area.right() / scale.tileWidth) * scale.tileWidth;
    var minY = Math.floor(area.top / scale.tileHeight) * scale.tileHeight;
    var maxY = Math.ceil(area.bottom() / scale.tileHeight) * scale.tileHeight;

    var tileRect = new Rectangle(0, 0, 0, 0);
    for (var wx = minX; wx < maxX; wx += scale.tileWidth) {
        for (var wy = minY; wy < maxY; wy += scale.tileHeight) {
            tileRect.left = wx;
            tileRect.top = wy;
            tileRect.width = scale.tileWidth;
            tileRect.height = scale.tileHeight;

            var fc = layer.def.getTile(scale, wx, wy, firstChoice);
            if (!fc) {
                // there's nothing there, so don't try to draw anything
            } else if (fc.texture.baseTexture.hasLoaded) {
                callback(tileRect, scale, fc.texture);
            } else if (otherScales.length) {
                var nextScale = otherScales[0];
                var otherScales2 = otherScales.slice(1);
                enumerateTiles(layer, tileRect, nextScale, false, otherScales2, callback);
            }
        }
    }
}
