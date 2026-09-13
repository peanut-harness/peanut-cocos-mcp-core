@ccclass('cc.TrailModule')
export class TrailModule {
    @serializable
    public widthFromParticle = true;

    @serializable
    public colorFromParticle = false;

    @serializable
    public widthRatio = 1;

    @serializable
    public probeGapOnlyField = false;

    @serializable
    protected _enable = false;
}

@ccclass('cc.LabelExtra')
export class LabelExtra {
    @serializable
    public extraScale = 1;

    @serializable
    protected _extraLabel = '';
}

@ccclass('cc.ParticleSystem')
export class ParticleSystem {
    @type(TrailModule)
    @serializable
    public _trailModule = new TrailModule();

    @serializable
    public duration = 5;
}
