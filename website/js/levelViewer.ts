import { Rectangle } from './coords';
import * as model from './model';
import * as util from './util';
import * as wiamap from './wiamap';

export function init(level: model.Level) {
    model.levelPopulate(level);

    var widget = new wiamap.Widget();

    var el = widget.getElement();
    el.setAttribute('class', 'wiamap-stage');
    document.body.appendChild(el);

    var fogEntity = findFogEntityNearestPlayer(level);
    el.style.background = makeBackgroundGradient(level, fogEntity);
    if (fogEntity)
        widget.addLayer(new StarsLayer(model.entityProperties(fogEntity)));

    populateLayers(widget, level);

    widget.scrollTo(level.properties['p1_x'], level.properties['p1_y'], 0.5);
}

function findFogEntityNearestPlayer(level: model.Level) {
    var p1_x = level.properties['p1_x'];
    var p1_y = level.properties['p1_y'];
    var fogs = _.filter(level.allEntities, e => model.entityName(e) == 'fog_trigger');
    var closestFog = _.min(fogs, e => Math.pow(p1_x - model.entityX(e), 2) + Math.pow(p1_y - model.entityY(e), 2));
    return <any>closestFog !== Infinity ? closestFog : null;
}

function makeBackgroundGradient(level: model.Level, fogEntity: model.Entity) {
    if (fogEntity) {
        var properties = model.entityProperties(fogEntity);
        return makeSkyGradient(properties['gradient'], properties['gradient_middle']);
    }

    return makeSkyGradient(level.properties['cp_background_colour'], level.properties['cp_background_middle']);
}

function makeSkyGradient(colors: number[], middle: number) {
    return 'linear-gradient(' +
        util.convertIntToColorRGB(colors[0]) + ',' +
        util.convertIntToColorRGB(colors[1]) + ' ' + (middle * 100) + '%,' +
        util.convertIntToColorRGB(colors[2]) + ')';
}

function populateLayers(widget: wiamap.Widget, level: model.Level) {
    _.each(level.layers, (layer, layerID) => {
        var layerNum = parseInt(layerID, 10);
        var parallax = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95][layerNum] || 1;
        var layerScale = layerNum <= 5 ? 1 : parallax;
        var scales = _.map(layer.scales, s => new LevelWiamapTileScale(s.scale, s.tile_size, layerScale, s.tiles));
        var layerDef = new LevelWiamapTileLayerDef(level, layerID, scales, layerNum, parallax);
        widget.addLayer(new wiamap.TileLayer(layerDef));
    });
}



class LevelWiamapTileLayerDef implements wiamap.TileLayerDef {
    public type = "tile";

    constructor(private level: model.Level, public id: string,
        public scales: wiamap.TileScale[], public zindex: number, public parallax: number) { }

    public getTile(scale: LevelWiamapTileScale, x: number, y: number): wiamap.Tile {
        var realX = Math.round(x / scale.layerScale);
        var realY = Math.round(y / scale.layerScale);
        if (!_.find(scale.tiles, t => t[0] === realX && t[1] === realY))
            return;

        return {
            imageURL: '/static/level-assets/' + this.level.path
                + '/' + this.id + '_' + scale.scale + '_' + realX + ',' + realY + '.png',
        };
    }
}

class LevelWiamapTileScale implements wiamap.TileScale {
    public tileWidth: number;
    public tileHeight: number;

    constructor(public scale: number, public tileSize: [number, number], public layerScale: number, public tiles: [number, number][]) {
        this.tileWidth = tileSize[0] * layerScale;
        this.tileHeight = tileSize[1] * layerScale;
    }
}

class StarsLayer implements wiamap.Layer {
    public def: wiamap.LayerDef;
    public callback: wiamap.LayerCallback;

    constructor(private fog: { [key: string]: any }) {
        this.def = { id: 'stars', zindex: 0, parallax: 0.025 };
    }

    public draw(viewport: wiamap.Viewport, context: CanvasRenderingContext2D, canvasRect: Rectangle, worldRect: Rectangle) {
        context.fillStyle = 'white';  // TODO: blend with white using fog_colour and fog_per
        var midpoint = this.fog['gradient_middle'] * viewport.size.height;
        for (var s = 0; s < 500; ++s) {
            var x = Math.random() * canvasRect.width;
            var y = Math.random() * canvasRect.height;
            var [topY, botY, topA, botA] = canvasRect.top + y < midpoint
                ? [0, midpoint, this.fog['star_top'], this.fog['star_middle']]
                : [midpoint, viewport.size.height, this.fog['star_middle'], this.fog['star_bottom']];
            var pct = (canvasRect.top + y - topY) / (botY - topY);
            context.globalAlpha = Math.max(0, Math.min(1, topA * pct + botA * (1 - pct)));
            // TODO: glowing circle instead of flat square
            context.fillRect(x, y, 2, 2);
        }
    }
}
